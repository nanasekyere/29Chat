import app from './app';
import http from 'http';
import { Server } from 'socket.io';

const PORT = process.env.CHAT_SERVICE_PORT || 3002;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
})

server.listen(PORT, () => {
  console.log('Chat service is running on port ' + PORT)
})
