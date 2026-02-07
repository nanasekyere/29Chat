import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import expressWinston from 'express-winston';
import logger from './utils/logger';
import { jwtAuth } from './middleware/auth.middleware';
import proxyMiddleware from './middleware/proxy.middleware';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  colorize: false,
}));

app.use(jwtAuth);

app.use("/api", proxyMiddleware);
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'OK' });
});

app.use(expressWinston.errorLogger({
  winstonInstance: logger,
}));

app.use(errorMiddleware);

export default app;
