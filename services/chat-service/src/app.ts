import express from 'express';
import helmet from 'helmet';
import cors from 'cors'
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(errorMiddleware)

export default app;
