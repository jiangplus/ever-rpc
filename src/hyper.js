const network = require('@hyperswarm/network')
const crypto = require('crypto')

const net = network()

// look for peers listed under this topic
const topic = crypto.createHash('sha256')
  .update('hyperswarm')
  .digest()

net.join(topic, {
  lookup: true, // find & connect to peers
  announce: true // optional- announce self as a connection target
})

net.on('connection', (socket, details) => {
  console.log('new connection!', details)

  // you can now use the socket as a stream, eg:
  process.stdin.pipe(socket).pipe(process.stdout)
})