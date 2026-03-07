import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import messageRoutes from './routes/message.routes'
import { createErrorMiddleware, gatewayAuth } from '@29chat/common';


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(gatewayAuth);
app.use('/', messageRoutes);
app.use(createErrorMiddleware('message-storage-service'));

export default app;
