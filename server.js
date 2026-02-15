const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }   // Change to your domain later for security
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('User connected');

  // Spawn a shell (bash on Linux/macOS, powershell or cmd on Windows)
  const shell = pty.spawn(
    process.platform === 'win32' ? 'powershell.exe' : 'bash',
    [],
    {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    }
  );

  // Send shell output → browser
  shell.onData(data => socket.emit('output', data));

  // Browser input → shell
  socket.on('input', data => {
    shell.write(data);
  });

  // Resize handling (optional but nice)
  socket.on('resize', ({ cols, rows }) => {
    shell.resize(cols, rows);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    shell.kill();
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
