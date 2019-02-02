

const grpc = require('grpc')
const protoloader = require('@grpc/proto-loader');
const log = console.log.bind(console)

const protofile = process.cwd() + '/src/channel.proto'
const packageDefinition = protoloader.loadSync(
    protofile,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    })
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const voidrpc = protoDescriptor.voidrpc

class Server {
  constructor() {
    this.pubkey = 'alice'
    this.port = '12001'
    this.host = 'localhost'
  }

  onPing(call, callback) {
    callback(null, {pubkey: this.pubkey, host: 'localhost', port: this.port})
  }

  onDownload(call) {
    call.write({key: 'hello', from: 0, size: 10, data: Buffer.from('hello')})
    call.end()
  }

  start() {
    let server = this.server = new grpc.Server()
    server.addService(voidrpc.VoidRPC.service, {
      ping: this.onPing.bind(this),
      download: this.onDownload.bind(this),
    })
    server.bind('0.0.0.0:12001', grpc.ServerCredentials.createInsecure())
    server.start()
    log('server started')
  }
}

class Client {

  constructor() {
    this.pubkey = 'bob'
    this.port = '12002'
    this.host = 'localhost'
  }

  connect(info) {
    return new Promise((resolve, reject) => {
      let callback = (err, resp) => {
        console.log('return', err, resp)
        if (err) {
          reject(err)
        } else {
          resolve(resp)
        }
      }

      let client = new voidrpc.VoidRPC(info.host+':'+info.port, grpc.credentials.createInsecure())
      client.ping({pubkey: this.pubkey, host: this.host, port: this.port}, callback)

      let call = client.download({})

      call.on('data', function(payload) {
          console.log(payload)
      })
      call.on('end', function() {
        // The server has finished sending
      })
      call.on('error', function(e) {
        // An error has occurred and the stream has been closed.
      })
      call.on('status', function(status) {
        console.log('status', status)
        // process status
      })

    })
  }
}

let server = new Server()
server.start()

let client = new Client()
client.connect({host: 'localhost', port: '12001'}).then(console.log).catch(console.error)

