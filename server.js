const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }  // For testing; restrict later
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('Connection opened');

  const shell = pty.spawn(
    process.platform === 'win32' ? 'powershell.exe' : 'bash',
    [],
    {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/tmp',
      env: { ...process.env, TERM: 'xterm-256color' }
    }
  );

  shell.onData((data) => socket.emit('output', data.toString()));

  socket.on('input', (data) => shell.write(data));

  socket.on('resize', ({ cols, rows }) => {
    shell.resize(cols, rows);
  });

  socket.on('disconnect', () => {
    shell.kill();
    console.log('Connection closed');
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Terminal server listening on ${port}`);
});
