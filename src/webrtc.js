
const Peer = require('simple-peer')
const wrtc = require('wrtc')

const peer1 = new Peer({ initiator: true, wrtc: wrtc })
const peer2 = new Peer({ wrtc: wrtc })

peer1.on('signal', function (data) {
  // when peer1 has signaling data, give it to peer2 somehow
  console.log('signal', data)
  peer2.signal(data)
})

peer2.on('signal', function (data) {
  // when peer2 has signaling data, give it to peer1 somehow
  peer1.signal(data)
})

peer1.on('connect', function () {
  // wait for 'connect' event before using the data channel
  peer1.send('hey peer2, how is it going?')
})

peer2.on('data', function (data) {
  // got a data channel message
  console.log('got a message from peer1: ' + data)
})