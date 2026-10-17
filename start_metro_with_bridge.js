const { spawn } = require('child_process');
const net = require('net');

console.log('Starting Expo Metro bundler on localhost:8081...');
const metro = spawn('node', ['node_modules/expo/bin/cli', 'start', '--localhost', '-p', '8081'], {
  stdio: 'inherit',
  shell: true
});

setTimeout(() => {
  const bridge = net.createServer((clientSocket) => {
    const target = net.connect({ host: '::1', port: 8081 }, () => {
      clientSocket.pipe(target);
      target.pipe(clientSocket);
    });
    clientSocket.on('error', () => target.destroy());
    target.on('error', () => clientSocket.destroy());
  });

  bridge.on('error', (err) => {
    console.log('Bridge note:', err.message);
  });

  bridge.listen(8081, '127.0.0.1', () => {
    console.log('Bridge successfully listening on 127.0.0.1:8081 -> [::1]:8081');
  });
}, 4000);

metro.on('exit', (code) => {
  console.log('Metro exited with code', code);
  process.exit(code);
});
