import express from 'express';
import helmet from 'helmet';
import cors from 'cors'
import { createErrorMiddleware } from '@29chat/common';

const app = express();

app.use(helmet());
app.use(cors());
app.use(createErrorMiddleware('chat-service'))

export default app;
