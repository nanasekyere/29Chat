import { createProxyMiddleware, Options, fixRequestBody } from 'http-proxy-middleware';
import { Router, RequestHandler } from 'express';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import logger from '../utils/logger';

const router = Router();

const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/auth': '' },
  },
  chat: {
    target: process.env.CHAT_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/chat': '' },
  },
  message: {
    target: process.env.MESSAGE_STORAGE_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: { '^/message': '' },
  },
  presence: {
    target: process.env.PRESENCE_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/presence': '' },
  },
};

const createProxy = ({ target, pathRewrite }: { target: string, pathRewrite: Record<string, string> }): RequestHandler => {
  const options: Options = {
    target,
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    pathRewrite,

    on: {
      error: (err, req, res) => {
        logger.error('Proxy error', { error: err.message, target });
        if ('status' in res && typeof res.status === 'function') {
          res.status(502).json({ message: `Proxy error on Service: ${target}`});
        }
      },
      proxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse) => {
        req.headers.authorization && proxyReq.setHeader('authorization', req.headers.authorization);
        const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
        proxyReq.setHeader('x-correlation-id', correlationId);
        proxyReq.setHeader('x-forwarded-by', 'api-gateway');
        fixRequestBody(proxyReq, req);
      },
    },
  }

  return createProxyMiddleware(options);
}

router.use('/auth', createProxy(services.auth));
router.use('/chat', createProxy(services.chat));
router.use('/message', createProxy(services.message));
router.use('/presence', createProxy(services.presence));

export default router;
