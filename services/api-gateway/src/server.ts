import app from './app';
import logger from './utils/logger';

const port = process.env.API_GATEWAY_PORT || 3000;

app.listen(port, () => {
  logger.info(`Gateway Service is running on port ${port}`);
});
