import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import { createLogger, createErrorMiddleware } from '@29chat/common';
import { jwtAuth } from './middleware/auth.middleware';
import proxyMiddleware from './middleware/proxy.middleware';

const logger = createLogger('api-gateway');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'OK' });
});

app.use(jwtAuth);

app.use("/api", proxyMiddleware);

app.use(createErrorMiddleware('api-gateway'));

export default app;
