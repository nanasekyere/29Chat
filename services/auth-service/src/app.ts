import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import passport from './passport';
import authRoutes from './routes/auth.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

const port = process.env.AUTH_SERVICE_PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/', authRoutes);
app.use(errorMiddleware);

export default app;
