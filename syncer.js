var pull = require('pull-stream')
var Pushable = require('pull-pushable')
var pullwrite = require('pull-write-file')
var pullfile = require('pull-file')

var MRPC = require('./src/muxrpc')
var MultiServer = require('./src/multiserver')
var findit = require('findit')
var mkdirp = require('mkdirp');

var EventEmitter = require('events')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var cbor = require('cbor')


function filehashing(filename, callback) {
  const hashes = []
  const stream = fs.createReadStream(filename)
  stream.on('readable', function() {
    let data
    while (data = this.read(4096)) {
      let hash = crypto.createHash('sha256').update(data).digest()
      hashes.push(hash)
    }
  })

  stream.on('end', (data) => {
    callback({
      key: crypto.createHash('sha256').update(Buffer.concat(hashes)).digest()
    })
  })
}

function createStream (dir) {
  var pushable = Pushable(true)
  var finder = findit(dir)
  var rel = dir
   
  finder.on('directory', function (dir, stat, stop) {
      var base = path.basename(dir)
      if (base === '.git' || base === 'node_modules') stop()
  })
   
  finder.on('file', function (file, stat) {
    pushable.push({file, stat})
  })

  finder.on('end', () => {
    pushable.end()
  })

  return pull(
    pushable,
    pull.asyncMap(({file, stat}, cb) => {
      filehashing(file, (hashObj) => {
        cb(null, {
          file: file,
          hash: hashObj.key.toString('hex'),
          size: stat.size
        })
      })
    }),
    pull.map(obj => {
      if (rel) {
        obj.file = obj.file.substring(rel.length)
      }
      return obj
    })
  )
}

var api = {
  hello: 'async',
  stuff: 'source',
  list: 'source',
  fetch: 'source',
}

class Sycner extends EventEmitter {
  constructor(dir, opts) {
    super()

    console.log('started', dir, opts)
    this.dir = dir[dir.length-1] == '/' ? dir : dir + '/'
    this.address = opts.address
    this.isServer = opts.isServer

    if (this.isServer) {
      this.startServer()
    } else {
      this.startClient()
    }

    this.on('handshake', () => {
      console.log('handshake')
    })

    this.on('fetch', (rfile) => {
      console.log('fetch', rfile)
      var rpath = path.join(this.dir, rfile.file)
      var rdir = path.dirname(rpath);
      mkdirp.sync(rdir)
      pull(
        this.client.fetch(rfile.file),
        pullwrite(rpath, {}, (err) => {
          this.emit('done', rfile)
        })
      )
    })
  }

  startServer() {
    var ms = MultiServer([
      require('multiserver/plugins/ws')({host: 'localhost', port: 2345})
    ])
     var close = ms.server((stream) => {
      var server = MRPC(null, api) ({
        hello: (cb) => {
          cb(null, ('welcome'))
        },
        stuff: () => {
          return pull.values([1, 2, 3, 4, 5])
        },
        fetch: (filename) => {
          return pullfile(this.dir+filename, { bufferSize: 800 })
        },
        list: () => {
          return createStream(this.dir)
        }
      })

      var b = server.createStream()
      pull(b, stream, b)
    })
  }

  startClient() {
    var client = MRPC(api, null) ()
    this.client = client

    var a = client.createStream(console.log.bind(console, 'stream is closed'))
    var ms = MultiServer([
      require('multiserver/plugins/ws')({host: 'localhost', port: 2345})
    ])
    var abort = ms.client('ws://localhost:2345', (err, stream) => {
      pull(a, stream, a)

      client.hello((err, value) => {
        if(err) throw err
        console.log(value)
        this.emit('handshake')
      })

      pull(
        createStream(this.dir), 
        pull.collect((err, localfiles) => {
          console.log('local', err, localfiles)

          pull(client.list(), pull.collect((err, remotefiles) => {
            console.log('remote', err, remotefiles)

            remotefiles.map((rfile) => {
              let lfile = localfiles.find(x => x.file == rfile.file)
              if (!lfile || lfile.hash != rfile.hash) {
                this.emit('fetch', rfile)
              }
            })
          }))
        })
      )

    })
  }
}

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: { 
      p: 'port',
      s: 'server',
      c: 'client',
      d: 'dir'
    }
});

let sync = new Sycner(argv.dir, {
  isServer: !!argv.server,
  address: argv.port
})

