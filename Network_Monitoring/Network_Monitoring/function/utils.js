const moment = require("moment")

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes == 0) return '0 Byte'
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

function convert (byte) {
    var sizes = ['Bytes', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
    byte = byte * 8
    if (byte == 0) return '0 Byte'
    var i = parseFloat(Math.floor(Math.log(byte) / Math.log(1000))) 
    return parseFloat(byte / Math.pow(1000, i), 2).toFixed(2) + ' ' + sizes[i]
}

function dateConverter (date) {
    const someday = moment(date).format('MMMM Do YYYY, h:mm:ss a')
    return someday.split(" ").join("_")
}

function filterInterface(index_, ip_) {
    if (ip_ == "10.9.99.1") {
      if (index_ == 1) {
        return "Gi0/0/2";
      } else if (index_ == 3) {
        return "Gi0/0/0";
      } else {
        return null;
      }

    } else if (ip_ == "10.77.7.1") {
      if (index_ == 3) {
        return "Gi1/0/1";
      } else if (index_ == 4) {
        return "Gi1/0/2";
      } else if (index_ == 20) {
        return "Gi1/1/1";
      } else if (index_ == 21) {
        return "Gi1/1/2";
      } else if (index_ == 22) {
        return "Gi1/1/3";
      } else if (index_ == 23) {
        return "Gi1/1/4";
      } else {
        return null;
      }

    } else if (ip_ == "10.9.99.2") {
      if (index_ == 9) {
        return "Gi2/1";
      } else if (index_ == 10) {
        return "Gi2/2";
      } else if (index_ == 11) {
        return "Gi2/3";
      } else if (index_ == 12) {
        return "Gi2/4";
      } else if (index_ == 14) {
        return "Gi2/6";
      } else if (index_ == 55) {
        return "Gi3/41";
      } else if (index_ == 57) {
        return "Gi3/43";
      } else if (index_ == 59) {
        return "Gi3/45";
      } else if (index_ == 61) {
        return "Gi3/47";
      } else {
        return null;
      }
    }

    if (ip_ == "10.77.7.2") {
      if (index_ == 10149) {
        return "Gi0/49";
      } else if (index_ == 10148) {
        return "Gi0/48";
      } else {
        return null;
      }
    }

    if (ip_ == "10.77.1.2") {
      if (index_ == 10103) {
        return "Gi0/3";
      } else if (index_ == 10149) {
        return "Gi0/49";
      } else if (index_ == 10151) {
        return "Gi0/51";
      } else {
        return null;
      }
    }
    
    if (ip_ == "10.77.5.2") {
      if (index_ == 10149) {
        return "Gi0/49";
      } else if (index_ == 10150) {
        return "Gi0/50";
      } else if (index_ == 10151) {
        return "Gi0/51";
      } else if (index_ == 10152) {
        return "Gi0/52";
      } else {
        return null;
      }
    }
    if (ip_ == "10.77.3.2") {
      if (index_ == 10149) {
        return "Gi0/49";
      } else if (index_ == 10151) {
        return "Gi0/51";
      } else {
        return null;
      }
    }
    if (ip_ == "10.77.8.2") {
      if (index_ == 10149) {
        return "Gi0/49";
      } else if (index_ == 10151) {
        return "Gi0/51";
      } else {
        return null;
      }
    }
    if (ip_ == "10.61.4.49") {
      if (index_ == 26) {
        return "Gi26";
      } else {
        return null;
      }
    }
  }
  

module.exports = {
    bytesToSize,
    convert,
    dateConverter,
    filterInterface
}