import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import messageRoutes from './routes/message.routes'
import { errorMiddleware } from './middleware/error.middleware';


const app = express();

const port = process.env.MESSAGE_STORAGE_SERVICE_PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', messageRoutes);
app.use(errorMiddleware);

export default app;
