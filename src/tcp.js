const net = require('net');


const server = net.createServer((socket) => {
  socket.end('goodbye\n');
}).on('error', (err) => {
  // handle errors here
  throw err;
});

// grab an arbitrary unused port.
server.listen(4455, () => {
  console.log('opened server on', server.address());
});

function connect() {

  const client = net.createConnection({ port: 4455 }, () => {
    // 'connect' listener
    console.log('connected to server!');
    client.write('world!\r\n');
  });
  client.on('data', (data) => {
    console.log(data.toString());
    client.end();
  });
  client.on('end', () => {
    console.log('disconnected from server');
  });

}

connect()