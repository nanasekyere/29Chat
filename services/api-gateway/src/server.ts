import app from './app';
import logger from './utils/logger';

const port = process.env.API_GATEWAY_PORT || 3000;

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

app.listen(port, () => {
  logger.info(`Gateway Service is running on port ${port}`);
});
