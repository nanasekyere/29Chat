import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './passport';
import authRoutes from './routes/auth.routes';
import jwt from 'jsonwebtoken';
import { createErrorMiddleware } from '@29chat/common';

const app = express();

const port = process.env.AUTH_SERVICE_PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => cookieParser(process.env.COOKIE_SECRET)(req, res, next));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/', authRoutes);
app.use(createErrorMiddleware('auth-service', [
  (err, _req, res) => {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
      res.status(401).json({ message });
      return true;
    }
    return false;
  },
]));

export default app;
