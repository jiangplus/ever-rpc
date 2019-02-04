var nano = require('nanomsg');

var pub = nano.socket('pub');
var sub = nano.socket('sub');

var addr = 'tcp://127.0.0.1:7789'
pub.bind(addr);
sub.connect(addr);

sub.on('data', function (buf) {
  console.log(String(buf));
  pub.close();
  sub.close();
});

setTimeout(function () {
  pub.send("Hello from nanomsg!");
}, 100);