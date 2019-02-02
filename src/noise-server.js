var peer = require('noise-peer')
var through = require('through2')
var pump = require('pump')
var net = require('net')

var server = net.createServer(function (rawStream) {
  var sec = peer(rawStream, false)

  pump(sec, through(function (buf, _, cb) {
    cb(null, buf.toString().toUpperCase())
  }), sec)
})

server.listen(5000)