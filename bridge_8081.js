const net = require('net');

const server = net.createServer((socket) => {
  const target = net.connect(8081, '::1');
  socket.pipe(target).pipe(socket);

  target.on('error', (err) => {
    socket.destroy();
  });
  socket.on('error', (err) => {
    target.destroy();
  });
});

server.listen(8081, '127.0.0.1', () => {
  console.log('Bridge active: 127.0.0.1:8081 -> [::1]:8081');
});
