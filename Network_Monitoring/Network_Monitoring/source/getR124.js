var snmp = require('snmp-native')
var firebase = require('firebase')
var moment = require('moment')
var Utils = require("../function/utils")

module.exports = function getR124 () {

    let ipAddress = "10.77.1.2"
    standardGetR124 = {}
    let r124 = new snmp.Session({ host: ipAddress, community: 'public' })
    ///********* Detail ************///
    //os
    r124.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetR124 = {
            date: moment().format("L"),
            switch: 'R124',
            os: varbinds[0].value
        }
    })

    //uptime
    r124.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetR124.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    r124.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR124.cpu = varbinds[0].value
    })
    //memory
    r124.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR124.mem = Utils.bytesToSize(varbinds[0].value)
    })
    //temp
    r124.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetR124.temp = varbinds[0].value
    })


    //inbound 
    var inbound = []
    r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbound.push(data)
        }
    })

      //outbound 
    var outbound = []
    r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbound.push(data)
        }
    })

    //status
    var status = []
    r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
        for (index in varbinds) {
            if(varbinds[index].value == 1){ 
                status.push('Up') 
            }
            else if (varbinds[index].value == 2) {
                status.push('Down')
            }
        }
    })

    ///********* interface ************///

    var interface = []
    var interfacesupdate = []
    setInterval(() => {
        interface = []
        interfacesupdate = []
        interfacestofirebase = []
        r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (index in varbinds) {
                interfacesupdate.push(varbinds[index].value)
            }
    
            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index],
                    inbound: inbound[index].inbound,
                    outbound: outbound[index].outbound
                }
                interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                interface.push(data)
            }

            db.child("server1").child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interfacestofirebase)
           
            ///********* Toprank ************///

            let inbounds = []
            let outbounds = []

            for ( i in interface ) {
                for ( x in inbound ) {
                    if(interface[i].indexOID === inbound[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan11') {
                            outbounds.push({
                                ip:  '10.1.201.0 0/24',
                                value : outbound[x].outbound 
                            })
                            inbounds.push({
                                ip: '10.1.201.0 0/24',
                                value: inbound[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan14') {
                            inbounds.push({
                                ip: '10.1.224.0 0/24',
                                value: inbound[x].inbound 
                            })
                            outbounds.push({
                                ip: '10.1.224.0 0/24',
                                value: outbound[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan15') {
                            inbounds.push({ 
                                ip: '10.1.160.0 0/22',
                                value: inbound[x].inbound 
                            })
                            outbounds.push({ 
                                ip: '10.1.160.0 0/22',
                                value: outbound[x].outbound 
                            }) 
                        }
                    }
                }
            }
            
            let toprank = {
                ip: ipAddress,
                inbound: inbounds,
                outbounds: outbounds
            }
            db.child("server1").child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

            ///*********traffic ************///
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbound) {
                inboundTotal += inbound[index].inbound
                outboundTotal += outbound[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child("server1").child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbound.length)
            }

            db.child("server1").child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },30000)

    setTimeout(() => {
        getR124s = {
            ip: ipAddress,
            device: standardGetR124
        }
    },1000)
}
