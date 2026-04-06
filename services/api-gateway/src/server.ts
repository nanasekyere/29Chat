import app from './app';
import { createLogger } from '@29chat/common';

const logger = createLogger('api-gateway');

const port = process.env.API_GATEWAY_PORT || 3000;

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

if (!process.env.COOKIE_SECRET) {
  logger.error('COOKIE_SECRET is not set in environment variables');
  process.exit(1);
}

app.listen(port, () => {
  logger.info(`Gateway Service is running on port ${port}`);
});
