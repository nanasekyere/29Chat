import { createProxyMiddleware, Options, fixRequestBody } from 'http-proxy-middleware';
import { Router, RequestHandler } from 'express';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import logger from '../utils/logger';

const router = Router();

const host = process.env.HOST || 'localhost';
const authServicePort = process.env.AUTH_SERVICE_PORT || 3001;
const chatServicePort = process.env.CHAT_SERVICE_PORT || 3002;
const messageServicePort = process.env.MESSAGE_SERVICE_PORT || 3003;
const presenceServicePort = process.env.PRESENCE_SERVICE_PORT || 3004;

const services = {
  auth: {
    target: `http://${host}:${authServicePort}`,
    pathRewrite: { '^/auth': '' },
  },
  chat: {
    target: `http://${host}:${chatServicePort}`,
    pathRewrite: { '^/chat': '' },
  },
  message: {
    target: `http://${host}:${messageServicePort}`,
    pathRewrite: { '^/message': '' },
  },
  presence: {
    target: `http://${host}:${presenceServicePort}`,
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
        fixRequestBody(proxyReq, req);

        req.headers.authorization && proxyReq.setHeader('authorization', req.headers.authorization);
        req.headers['x-user-id'] && proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        req.headers['x-user-email'] && proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
        const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
        proxyReq.setHeader('x-correlation-id', correlationId);
        proxyReq.setHeader('x-forwarded-by', 'api-gateway');
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
