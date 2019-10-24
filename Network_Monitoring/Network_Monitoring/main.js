var snmp = require('snmp-native')
var firebase = require('firebase')
var moment = require('moment')
var Utils = require("./function/utils")
var Ip = require("./utils/ip")
var _ = require("lodash")
var fs = require('fs')

var firebaseConfig = {
  

    apiKey: "AIzaSyBeDAqhlPlwXtiemXaSp2Ed_3H8MKVCyyk",
    authDomain: "fitm-new.firebaseapp.com",
    databaseURL: "https://fitm-new.firebaseio.com",
    projectId: "fitm-new",
    storageBucket: "fitm-new.appspot.com",
    messagingSenderId: "907570627808",
    appId: "1:907570627808:web:efc246e832114aab0a3c85",
    
    
};


firebase.initializeApp(firebaseConfig);
let db = firebase.database().ref('db')


let getR124s = {}
var standardGetR124

let getR330As = {}
var standardGetR330A

let getR101Cs = {}
var standardGetR101C

let getR415s = {}
var standardGetR415

let getRshops = {}
var standardGetRshop

let getSw4503s = {}
var standardGetSw4503

let getSw3850s = {}
var standardGetSw3850

let getRsads = {}
var standardGetRsad


const getR124 = (ip,server,timetoshow) => {

    let ipAddress = ip
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
            for (var a = 0 ; a < 62 ; a++) {
                interfacesupdate.push(varbinds[a].value)
            }
            for (index in interfacesupdate) {
                if(index === 61) break;
                else {
                    let data = {
                        indexOID: varbinds[index].oid[10],
                        interface: interfacesupdate[index],
                        status: status[index],
                        inbound: _.get(inbound, `[${index}].inbound`, null),
                        outbound: outbound[index].outbound
                    }  
                    let datapick = _.omit(data,["indexOID"])

                    interface.push(data)
                    interfacestofirebase.push(datapick)
                }
            }

           // console.log("count serv1 =>", interfacestofirebase.length)
            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interfacestofirebase)
           
            ///********* Toprank ************///

            let inbounds = []
            let outbounds = []

            for ( i in interface ) {
                for ( x in inbound ) {
                    if(interface[i].indexOID === inbound[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan11') {
                            outbounds.push({
                                name: 'Vlan11',
                                ip:  '10.1.201.0 0/24',
                                value : outbound[x].outbound 
                            })
                            inbounds.push({
                                name: 'Vlan11',
                                ip: '10.1.201.0 0/24',
                                value: inbound[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan14') {
                            inbounds.push({
                                name: 'Vlan14',
                                ip: '10.1.224.0 0/24',
                                value: inbound[x].inbound 
                            })
                            outbounds.push({
                                name: 'Vlan14',
                                ip: '10.1.224.0 0/24',
                                value: outbound[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan15') {
                            inbounds.push({ 
                                name: 'Vlan15',
                                ip: '10.1.160.0 0/22',
                                value: inbound[x].inbound 
                            })
                            outbounds.push({ 
                                name: 'Vlan15',
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
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

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
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbound.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },timetoshow)

    setTimeout(() => {
        getR124s = {
            ip: ipAddress,
            device: standardGetR124
        }
    },1000)
}


const getR330A = (ip,server,timetoshow) => {

    let ipAddress = ip
    standardGetR330A = {}
    let r330a = new snmp.Session({ host: ipAddress, community: 'public' })
    ///********* Detail ************///
    //os
    r330a.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetR330A = {
            date: moment().format("L"),
            switch: 'R330A',
            os: varbinds[0].value
        }
    })

    //uptime
    r330a.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetR330A.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    r330a.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR330A.cpu = varbinds[0].value
    })
    //memory
    r330a.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR330A.mem = Utils.bytesToSize(varbinds[0].value)
    })
    //temp
    r330a.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetR330A.temp = varbinds[0].value
    })


    //inbound 
    var inbounds = []
    r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbounds.push(data)
        }
    })

      //outbound 
    var outbounds = []
    r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbounds.push(data)
        }
    })

    //status
    var status = []
    r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
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
        r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (var a = 0 ; a < 66 ; a++) {
                interfacesupdate.push(varbinds[a].value)
            }

            // console.log("=>  2  <=")
            for (index in interfacesupdate) {
                if(index === 65) break;
                else {
                    // console.log("\n",index)

                    let data = {
                        indexOID: varbinds[index].oid[10],
                        interface: interfacesupdate[index],
                        status: status[index],
                        inbound: inbounds[index].inbound,
                        outbound: outbounds[index].outbound
                    }  
                    // let datapick = _.pick(data,["interface","status","inbound","outbound"])

                    interface.push(data)
                    // interfacestofirebase.push(datapick)
                }
            }
            //console.log("count serv2 =>", interface.length)
            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)
           
            ///********* Toprank ************///

            let inboundss = []
            let outboundss = []

            for ( i in interface ) {
                for ( x in inbounds) {
                    if(interface[i].indexOID === inbounds[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan31') {
                            outboundss.push({
                                name: 'Vlan31',
                                ip:  '10.3.24.0 0/24',
                                value : outbounds[x].outbound 
                            })
                            inboundss.push({
                                name: 'Vlan31',
                                ip: '10.3.24.0 0/24',
                                value: inbounds[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan32') {
                            inboundss.push({
                                name: 'Vlan32',
                                ip: '10.3.25.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan32',
                                ip: '10.3.25.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan33') {
                            inboundss.push({ 
                                name: 'Vlan33',
                                ip: '10.3.27.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan33',
                                ip: '10.3.27.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                        else if (vlanName == 'Vlan34') {
                            inboundss.push({ 
                                name: 'Vlan34',
                                ip: '10.3.230.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan34',
                                ip: '10.3.230.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                        else if (vlanName == 'Vlan35') {
                            inboundss.push({ 
                                name: 'Vlan35',
                                ip: '10.3.32.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan35',
                                ip: '10.3.32.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                        else if (vlanName == 'Vlan36') {
                            inboundss.push({ 
                                name: 'Vlan36',
                                ip: '10.3.91.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan36',
                                ip: '10.3.91.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                        else if (vlanName == 'Vlan37') {
                            inboundss.push({ 
                                name: 'Vlan37',
                                ip: '10.3.92.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan37',
                                ip: '10.3.92.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                        else if (vlanName == 'Vlan38') {
                            inboundss.push({ 
                                name: 'Vlan38',
                                ip: '10.3.160.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({ 
                                name: 'Vlan38',
                                ip: '10.3.160.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                    }
                }
            }
            
            let toprank = {
                ip: ipAddress,
                inbound: inboundss,
                outbounds: outboundss
            }
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

            ///*********traffic ************///
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbounds) {
                inboundTotal += inbounds[index].inbound
                outboundTotal += outbounds[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbounds.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },timetoshow)

    setTimeout(() => {
        getR330As = {
            ip: ipAddress,
            device: standardGetR330A
        }
    },1000)
}

const getR101C = (ip,server,timetoshow) => {

    let ipAddress = ip
    standardGetR101C = {}
    let r101c = new snmp.Session({ host: ipAddress, community: 'public' })
    
    //os
    r101c.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetR101C = {
            date: moment().format("L"),
            switch: 'R101C',
            os: varbinds[0].value
        }
    })

    //uptime
    r101c.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetR101C.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    r101c.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR101C.cpu = varbinds[0].value
    })
    //memory
    r101c.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR101C.mem = Utils.bytesToSize(varbinds[0].value)
    })
    //temp
    r101c.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetR101C.temp = varbinds[0].value
    })


    //inbound 
    var inbounds = []
    r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbounds.push(data)
        }
    })

      //outbound 
    var outbounds = []
    r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbounds.push(data)
        }
    })

    //status
    var status = []
    r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
        for (index in varbinds) {
            if(varbinds[index].value == 1){ 
                status.push('Up') 
            }
            else if (varbinds[index].value == 2) {
                status.push('Down')
            }
        }
    })

    

    var interface = []
    var interfacesupdate = []
    setInterval(() => {
        interface = []
        interfacesupdate = []
        interfacestofirebase = []
        r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (var a = 0 ; a < 63 ; a++) {
                interfacesupdate.push(varbinds[a].value)
            }

            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index],
                    inbound: inbounds[index].inbound,
                    outbound: outbounds[index].outbound
                }  
                
                interface.push(data)
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                
            }

            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)
           
            

            let inboundss = []
            let outboundss = []

            for ( i in interface ) {
                for ( x in inbounds ) {
                    if(interface[i].indexOID === inbounds[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan121') {
                            outboundss.push({
                                name: 'Vlan121',
                                ip:  '10.1.10.0 0/24',
                                value : outbounds[x].outbound 
                            })
                            inboundss.push({
                                name: 'Vlan121',
                                ip: '10.1.10.0 0/24',
                                value: inbounds[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan122') {
                            inboundss.push({
                                name: 'Vlan122',
                                ip: '10.12.160.0 0/22',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan122',
                                ip: '10.12.160.0 0/22',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                    }
                }
            }
            
            let toprank = {
                ip: ipAddress,
                inbound: inboundss,
                outbounds: outboundss
            }
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

            
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbounds) {
                inboundTotal += inbounds[index].inbound
                outboundTotal += outbounds[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbounds.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },timetoshow)

    setTimeout(() => {
        getR101Cs = {
            ip: ipAddress,
            device: standardGetR101C
        }
    },1000)
}


const getR415 = (ip,server,timetoshow) => {

    let ipAddress = ip
    standardGetR415 = {}
    let r415 = new snmp.Session({ host: ipAddress, community: 'public' })
    ///********* Detail ************///
    //os
    r415.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetR415 = {
            date: moment().format("L"),
            switch: 'R415',
            os: varbinds[0].value
        }
    })

    //uptime
    r415.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetR415.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    r415.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR415.cpu = varbinds[0].value
    })
    //memory
    r415.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetR415.mem = Utils.bytesToSize(varbinds[0].value)
    })
    //temp
    r415.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetR415.temp = varbinds[0].value
    })


    //inbound 
    var inbounds = []
    r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbounds.push(data)
        }
    })

      //outbound 
    var outbounds = []
    r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbounds.push(data)
        }
    })

    //status
    var status = []
    r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
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
        r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (var a = 0 ; a < 74 ; a++) {
                interfacesupdate.push(varbinds[a].value)
            }

            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index],
                    inbound: inbounds[index].inbound,
                    outbound: outbounds[index].outbound
                }  
                
                interface.push(data)
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                
            }
            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)
           
            ///********* Toprank ************///

            let inboundss = []
            let outboundss = []

            for ( i in interface ) {
                for ( x in inbounds ) {
                    if(interface[i].indexOID === inbounds[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan51') {
                            outboundss.push({
                                name: 'Vlan51',
                                ip:  '10.4.8.0 0/24',
                                value : outbounds[x].outbound 
                            })
                            inboundss.push({
                                name: 'Vlan51',
                                ip: '10.4.8.0 0/24',
                                value: inbounds[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan52') {
                            inboundss.push({
                                name: 'Vlan52',
                                ip: '10.4.9.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan52',
                                ip: '10.4.9.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan53') {
                            inboundss.push({
                                name: 'Vlan53',
                                ip: '10.4.11.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan53',
                                ip: '10.4.11.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan54') {
                            inboundss.push({
                                name: 'Vlan54',
                                ip: '10.4.15.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan54',
                                ip: '10.4.15.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan55') {
                            inboundss.push({
                                name: 'Vlan55',
                                ip: '10.4.16.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan55',
                                ip: '10.4.16.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan56') {
                            inboundss.push({
                                name: 'Vlan56',
                                ip: '10.4.17.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan56',
                                ip: '10.4.17.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan57') {
                            inboundss.push({
                                name: 'Vlan57',
                                ip: '10.41.92.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan57',
                                ip: '10.41.92.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan58') {
                            inboundss.push({
                                name: 'Vlan58',
                                ip: '10.41.160.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan58',
                                ip: '10.41.160.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan206') {
                            inboundss.push({
                                name: 'Vlan206',
                                ip: '10.2.6.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan206',
                                ip: '10.2.6.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 

                    }
                }
            }
            
            let toprank = {
                ip: ipAddress,
                inbound: inboundss,
                outbounds: outboundss
            }
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

            ///*********traffic ************///
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbounds) {
                inboundTotal += inbounds[index].inbound
                outboundTotal += outbounds[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbounds.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },timetoshow)

    setTimeout(() => {
        getR415s = {
            ip: ipAddress,
            device: standardGetR415
        }
    },1000)
}

const getRshop = (ip,server,timetoshow) => {

    let ipAddress = ip
    standardGetRshop = {}
    let rshop = new snmp.Session({ host: ipAddress, community: 'public' })
    ///********* Detail ************///
    //os
    rshop.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetRshop = {
            date: moment().format("L"),
            switch: 'Rshop',
            os: varbinds[0].value
        }
    })

    //uptime
    rshop.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetRshop.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    rshop.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetRshop.cpu = varbinds[0].value
    })
    //memory
    rshop.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetRshop.mem = Utils.bytesToSize(varbinds[0].value)
    })
    //temp
    rshop.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetRshop.temp = varbinds[0].value
    })


    //inbound 
    var inbound = []
    rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
    rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
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
    rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
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
        rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
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
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                interface.push(data)
            }

            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)
           
            ///********* Toprank ************///

            let inbounds = []
            let outbounds = []

            for ( i in interface ) {
                for ( x in inbound ) {
                    if(interface[i].indexOID === inbound[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan88') {
                            outbounds.push({
                                name: 'Vlan88',
                                ip:  '10.88.160.0 0/24',
                                value : outbound[x].outbound 
                            })
                            inbounds.push({
                                name: 'Vlan88',
                                ip: '10.88.160.0 0/24',
                                value: inbound[x].inbound 
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
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)

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
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbound.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)

        })
    },timetoshow)

    setTimeout(() => {
        getRshops = {
            ip: ipAddress,
            device: standardGetRshop
        }
    },1000)
}

const getSw4503 = (ip,server,timetoshow) => {
    let ipAddress = ip
    standardGetSw4503 = {}

    let sw4503 = new snmp.Session({ host: ipAddress, community: 'public' })

    sw4503.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetSw4503 = {
            date: moment().format("L"),
            switch: 'SW4503',
            os: varbinds[0].value
        }
    })

    sw4503.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetSw4503.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    sw4503.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        standardGetSw4503.cpu = varbinds[0].value
    })

    //memory
    sw4503.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetSw4503.mem = Utils.bytesToSize(varbinds[0].value)
    })

    sw4503.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetSw4503.temp = varbinds[0].value
    })

    //inbound 
    var inbounds = []
    sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbounds.push(data)
        }
    })

    //outbound 
    var outbounds = []
    sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbounds.push(data)
        }
    })

    //status
    var status = []
    sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
        for (index in varbinds) {
            if(varbinds[index].value == 1){ 
                status.push('Up') 
            }
            else if (varbinds[index].value == 2) {
                status.push('Down')
            }
        }
    })

    var interface = []
    var interfacesupdate = []
    var interfacestofirebase = []

    setInterval(() => {
        interface = []
        interfacesupdate = []
        interfacestofirebase = []

        sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (var a = 0 ; a < 88 ; a++) {
                interfacesupdate.push(varbinds[a].value)
            }

            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index],
                    inbound: inbounds[index].inbound,
                    outbound: outbounds[index].outbound
                }  
                
                interface.push(data)
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                
            }

            db.child("server6").child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)

            ///********* Toprank ************///

            let inboundss = []
            let outboundss = []

            for ( i  in interface ) {
                for ( x in inbounds ) {
                    if (interface[i].indexOID === inbounds[x].indexOID) {
                        let vlanName = interface[i].interface

                        if (vlanName == 'Vlan43') {
                            outboundss.push({
                                name: 'Vlan43',
                                ip:  '10.4.101.0 0/24',
                                value : outbounds[x].outbound 
                            })
                            inboundss.push({
                                name: 'Vlan43',
                                ip: '10.4.101.0 0/24',
                                value: inbounds[x].inbound 
                            })  
                        }
                        else if (vlanName == 'Vlan44') {
                            inboundss.push({
                                name: 'Vlan44',
                                ip: '10.4.201.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan44',
                                ip: '10.4.201.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan45') {
                            inboundss.push({
                                name: 'Vlan45',
                                ip: '10.4.2.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan45',
                                ip: '10.4.2.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan46') {
                            inboundss.push({
                                name: 'Vlan46',
                                ip: '10.14.91.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan46',
                                ip: '10.14.91.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan47') {
                            inboundss.push({
                                name: 'Vlan47',
                                ip: '10.4.160.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan47',
                                ip: '10.4.160.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan99') {
                            inboundss.push({
                                name: 'Vlan99',
                                ip: '10.4.99.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan99',
                                ip: '10.4.99.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }  
                        else if (vlanName == 'Vlan304') {
                            inboundss.push({
                                name: 'Vlan304',
                                ip: '10.77.4.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan304',
                                ip: '10.77.4.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan305') {
                            inboundss.push({
                                name: 'Vlan305',
                                ip: '10.55.3.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan305',
                                ip: '10.55.3.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan777') {
                            inboundss.push({
                                name: 'Vlan777',
                                ip: '10.4.47.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan777',
                                ip: '10.4.47.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }
                    }
                }
            }

            let toprank = {
                ip: ipAddress,
                inbound: inboundss,
                outbounds: outboundss
            }
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)
        
            ///*********traffic ************///
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbounds) {
                inboundTotal += inbounds[index].inbound
                outboundTotal += outbounds[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbounds.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)
        
        })
    },timetoshow)


    setTimeout(() => {
        getSw4503s = {
            ip: ipAddress,
            device: standardGetSw4503
        }
    },1000)
      
}

const getSw3850 = (ip,server,timetoshow) => {
    let ipAddress = ip
    standardGetSw3850 = {}

    let sw3850 = new snmp.Session({ host: ipAddress, community: 'public' })

    sw3850.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetSw3850 = {
            date: moment().format("L"),
            switch: 'SW3850',
            os: varbinds[0].value
        }
    })

    sw3850.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetSw3850.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    sw3850.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1000] }, function (err, varbinds) {
        standardGetSw3850.cpu = varbinds[0].value
    })

    //memory
    sw3850.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        standardGetSw3850.mem = Utils.bytesToSize(varbinds[0].value)
    })

    sw3850.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        standardGetSw3850.temp = varbinds[0].value
    })

    //inbound 
    var inbounds = []
    sw3850.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                inbound: parseInt(varbinds[index].value/1048576)
            }
            inbounds.push(data)
        }
    })

    //outbound 
    var outbounds = []
    sw3850.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
        for (index in varbinds) {
            let data = {
                indexOID: varbinds[index].oid[10],
                outbound: parseInt(varbinds[index].value/1048576)
            }
            outbounds.push(data)
        }
    })

    //status
    var status = []
    sw3850.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
        for (index in varbinds) {
            if(varbinds[index].value == 1){ 
                status.push('Up') 
            }
            else if (varbinds[index].value == 2) {
                status.push('Down')
            }
        }
    })
 
    var interface = []
    var interfacestofirebase = []

    setInterval(() => {
        interface = []
        interfacesupdate = []
        interfacestofirebase = []

        sw3850.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            let interfacesupdate = ["GigabitEthernet0/0","Null0","GigabitEthernet1/0/1","GigabitEthernet1/0/2","GigabitEthernet1/0/3"
            ,"GigabitEthernet1/0/4","GigabitEthernet1/0/5","GigabitEthernet1/0/6","GigabitEthernet1/0/7","GigabitEthernet1/0/8","GigabitEthernet1/0/9"
            ,"GigabitEthernet1/0/10","GigabitEthernet1/0/11","GigabitEthernet1/0/12","GigabitEthernet1/1/1","GigabitEthernet1/1/2","GigabitEthernet1/1/3",
            "GigabitEthernet1/1/4","TenGigabitEthernet1/1/1","TenGigabitEthernet1/1/2","TenGigabitEthernet1/1/3","TenGigabitEthernet1/1/4","Stackport1","Vlan1",
            "Loopback1","Port-channel1","Vlan44","Vlan88","Vlan99","Vlan304"];


            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index],
                    inbound: inbounds[index].inbound,
                    outbound: outbounds[index].outbound
                }  
                
                interface.push(data)
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                
            }
            
            db.child("server7").child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)

            ///********* Toprank ************///

            let inboundss = []
            let outboundss = []

            for ( i  in interface ) {
                for ( x in inbounds ) {
                    if (interface[i].indexOID === inbounds[x].indexOID) {
                        let vlanName = interface[i].interface

                        
                        if (vlanName == 'Vlan44') {
                            inboundss.push({
                                name: 'Vlan44',
                                ip: '10.4.201.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan44',
                                ip: '10.4.201.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        else if (vlanName == 'Vlan99') {
                            inboundss.push({
                                name: 'Vlan99',
                                ip: '10.4.99.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan99',
                                ip: '10.4.99.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        }  
                        else if (vlanName == 'Vlan304') {
                            inboundss.push({
                                name: 'Vlan304',
                                ip: '10.77.4.0 0/24',
                                value: inbounds[x].inbound 
                            })
                            outboundss.push({
                                name: 'Vlan304',
                                ip: '10.77.4.0 0/24',
                                value: outbounds[x].outbound 
                            }) 
                        } 
                        
                       
                    }
                }
            }


            let toprank = {
                ip: ipAddress,
                inbound: inboundss,
                outbounds: outboundss
            }
            db.child(server).child("toprank").child(Utils.dateConverter(`${moment().format()}`)).set(toprank)
        
            ///*********traffic ************///
            let inboundTotal = 0
            let outboundTotal = 0
            let inputTraffic = {}

            for (index in inbounds) {
                inboundTotal += inbounds[index].inbound
                outboundTotal += outbounds[index].outbound
            }

            inboundTotal = Utils.convert(inboundTotal)
            outboundTotal = Utils.convert(outboundTotal)
            
            let traffics = {
                ip: ipAddress,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)


            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ipAddress,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbounds.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)
        
        })
    },timetoshow)


    setTimeout(() => {
        getSw3850s = {
            ip: ipAddress,
            device: standardGetSw3850
        }
    },1000)
      
}

const getRsad = (ip, server,timetoshow) => {
    let rsad = new snmp.Session({ host: ip, community: 'public' })


    //os
    rsad.get({ oid: [1,3,6,1,2,1,1,1,0] }, (err, varbinds) => {
        standardGetRsad = {
            date: moment().format("L"),
            switch: 'RSAD',
            os: varbinds[0].value
        }
    })

    rsad.get({ oid: [1,3,6,1,2,1,1,3,0] }, (err, varbinds) => {
        let timetick = varbinds[0].value
        let min = parseInt(timetick / 6000)
        let hour = parseInt(timetick / 360000)
        standardGetRsad.uptime = hour.toString()  + " hours " + min.toString() + " min "
    })

    //CPU
    rsad.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
        //1.3.6.1.4.1.9.9.109.1.1.1.1.5.1
        standardGetRsad.cpu = varbinds[0].value === 'noSuchObject' ? "novalue" : varbinds[0].value
    })
    // //memory
    // rsad.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
        //1.3.6.1.4.1.9.9.48.1.1.1.5.1
    //     standardGetRsad.mem = Utils.bytesToSize(varbinds[0].value) === NaN || varbinds[0].value === 'noSuchObject' ? "novalue" : varbinds[0].value
    // })
    // //temp
    // rsad.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
        //1.3.6.1.4.1.9.9.13.1.3.1.3
    //     standardGetRsad.temp = varbinds.length == 0 ? "novalue" : varbinds[0].value
    // })

    //inbound 
    var inbound = []
    rsad.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
    rsad.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
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
    rsad.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
        for (index in varbinds) {
            if(varbinds[index].value == 1){ 
                status.push('Up') 
            }
            else if (varbinds[index].value == 2) {
                status.push('Down')
            }
        }
    })

    var interface = []
    var interfacesupdate = []
    var interfacestofirebase = []

    setInterval(() => {
        interface = []
        interfacesupdate = []
        interfacestofirebase = []

        rsad.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
            for (index in varbinds) {
                interfacesupdate.push(varbinds[index].value)
            }
            
            for (index in interfacesupdate) {
                let data = {
                    indexOID: varbinds[index].oid[10],
                    interface: interfacesupdate[index],
                    status: status[index] === undefined ? "nodata" : status[index],
                    inbound: inbound[index].inbound,
                    outbound: outbound[index].outbound
                }
                // interfacestofirebase.push(_.pick(data,["interface","status","inbound","outbound"]))
                interface.push(data)            
            }
            db.child(server).child("interfaces").child(Utils.dateConverter(`${moment().format()}`)).set(interface)


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
                ip: ip,
                inbound: inboundTotal,
                outbound: outboundTotal
            }
            db.child(server).child("traffic").child(Utils.dateConverter(`${moment().format()}`)).set(traffics)

            ///********* Ratio ************///

            let inbound_ = Number(inboundTotal.substring(0,inboundTotal.search(' ')))
            let outbound_ = Number(outboundTotal.substring(0, outboundTotal.search(' ')))

            let ratio = {
                ip: ip,
                speed: (inbound_+outbound_)+' '+outboundTotal.substring(outboundTotal.search(' '),outbound.length)
            }

            db.child(server).child("ratio").child(Utils.dateConverter(`${moment().format()}`)).set(ratio)
        })
    },timetoshow)
    setTimeout(() => {
        getRsads = {
            ip: ip,
            device: standardGetRsad
        }
    },1000)
}
let Interfaces = []

const allAroundNetwork = ip => {
    let allArount = {}
    ip.map((values) => {
        let allAroundNetwork = new snmp.Session({ host: values.ip, community: 'public' })

            allAroundNetwork.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
                allAroundNetwork.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbindin) {
                    allAroundNetwork.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbindout) {
                        for (index in varbinds) 
                        {
                            let indexOf = Utils.filterInterface(varbinds[index].oid[10],values.ip)
                            if(indexOf !== null && indexOf !== undefined) {
                                let tus = varbinds[index].value

                                if (tus == 1) {
                                    let data = { 
                                        ip: values.ip,
                                        name: values.name,
                                        interface: indexOf, 
                                        status: varbinds[index].value == 1 ? "up" : "down",
                                        inbound: parseInt(varbindin[index].value/1048576),
                                        outbound: parseInt(varbindout[index].value/1048576)
                                    }
                                    Interfaces.push(data)
    
                                }
                                if (tus == 2 ) {
                                    let data2 = { 
                                        ip: values.ip,
                                        name: values.name,
                                        interface: indexOf,
                                        status: varbinds[index].value == 1 ? "up" : "down",
                                        inbound: varbindin.filter((a) => parseInt(a.value/1048576)),
                                        outbound: varbindout.filter((a) => parseInt(a.value/1048576))
                                    }
                                    Interfaces.push(data2)
                                }
                                // db.child("overall").update(Interfaces)

                            }
                        }
                    })
                })
            })    
    })

}

let time = 50000
getR124("10.77.1.2","server1",time)
getR330A("10.77.3.2","server2",time)
getR101C("10.77.7.2","server3",time)
getR415("10.77.5.2","server4",time)
getRshop("10.77.8.2","server5",time)
getSw4503("10.9.99.2","server6",time)
getSw3850("10.77.7.1","server7",time)
getRsad("10.61.4.49", "server8",time)


setInterval(() => {
    allAroundNetwork(Ip)
},2000)


setTimeout(() => { 
    db.child("server1").set(getR124s)
    db.child("server2").set(getR330As)
    db.child("server3").set(getR101Cs)
    db.child("server4").set(getR415s)
    db.child("server5").set(getRshops)
    db.child("server6").set(getSw4503s)
    db.child("server7").set(getSw3850s)
    db.child("server8").set(getRsads)
        
        var group = _.groupBy(Interfaces,"name")
        setInterval(() => {
            db.child("overall").child(Utils.dateConverter(`${moment().format()}`)).set(group)
        },300000)
}, 3000)

