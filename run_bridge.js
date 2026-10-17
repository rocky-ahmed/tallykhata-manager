const net = require('net');

const server = net.createServer((c) => {
  const s = net.connect({ host: '::1', port: 8081 }, () => {
    c.pipe(s);
    s.pipe(c);
  });
  s.on('error', () => c.destroy());
  c.on('error', () => s.destroy());
});

server.on('error', (err) => {
  console.error('Bridge error:', err);
});

server.listen(8081, '127.0.0.1', () => {
  console.log('Bridge ready on 127.0.0.1:8081 -> [::1]:8081');
});
