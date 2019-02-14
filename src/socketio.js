const server = require('http').createServer();
const io = require('socket.io')(server);
io.on('connection', client => {
  client.on('event', data => { console.log(data) });
  client.on('disconnect', () => { console.log(arguments) });
});
server.listen(3300);


setTimeout(() => {
  console.log('start')
  var socket = require('socket.io-client')('http://localhost:3300');
  socket.on('connect', console.log);
  socket.on('event', console.log);
  socket.on('disconnect', console.log);
  socket.send('hello')
}, 1000)

