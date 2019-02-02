const http2 = require('http2')
const fs = require('fs')

// generate certs:
//
// openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
//   -keyout localhost-privkey.pem -out localhost-cert.pem

const server = http2.createSecureServer({
  key: fs.readFileSync('localhost-privkey.pem'),
  cert: fs.readFileSync('localhost-cert.pem')
})
server.on('error', (err) => console.error(err))

server.on('stream', (stream, headers) => {
  stream.respond({
    'content-type': 'text/html',
    ':status': 200
  })
  stream.end('<h1>Hello World</h1>')
})

server.listen(8443)