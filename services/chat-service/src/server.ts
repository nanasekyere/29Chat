import http from 'http';
import { Server } from 'socket.io';
import { createLogger } from '@29chat/common';
import app from './app';
import { socketAuth } from './middleware/socket-auth.middleware';
import { handleConnection } from './controllers/socket.controller';
import { rabbitManager } from './rabbitmq.manager';

const PORT = process.env.CHAT_SERVICE_PORT || 3002;
const logger = createLogger('chat-service');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

io.use(socketAuth);
io.on('connection', (socket) => handleConnection(io, socket));

async function start() {
  await rabbitManager.init();

  server.listen(PORT, () => {
    logger.info(`Chat service running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start chat service: ${err.message}`);
  process.exit(1);
});
