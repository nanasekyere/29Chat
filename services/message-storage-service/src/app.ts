import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import messageRoutes from './routes/message.routes'
import { errorMiddleware } from './middleware/error.middleware';


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/', messageRoutes);
app.use(errorMiddleware);

export default app;
