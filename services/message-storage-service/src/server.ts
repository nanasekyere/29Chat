import app from './app';
import { startConsumer, stopConsumer } from './consumers/message.consumer';

const port = process.env.MESSAGE_STORAGE_SERVICE_PORT || 3003;

const server = app.listen(port, () => {
  console.log('Message storage service is running on port ' + port);
  startConsumer();
});

process.on('SIGTERM', async () => {
  await stopConsumer();
  server.close();
});
