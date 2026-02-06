import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { jwtAuth } from './middleware/auth.middleware';
import winston from 'winston';
import expressWinston from 'express-winston';
import proxyMiddleware from './middleware/proxy.middleware';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

expressWinston.requestWhitelist.push('body');
expressWinston.responseWhitelist.push('body');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: true,
  colorize: false,
}));

app.use(jwtAuth);

app.use("/api", proxyMiddleware);

app.use(expressWinston.errorLogger({
  winstonInstance: logger,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
}));

export default app;
