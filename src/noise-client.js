var peer = require('noise-peer')
var pump = require('pump')
var net = require('net')

var rawStream = net.connect(5000)

var sec = peer(rawStream, true)

pump(sec, process.stdout)
sec.end('beep boop\n')