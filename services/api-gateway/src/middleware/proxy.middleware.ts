import createProxyMiddleware from 'http-proxy-middleware';
import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

const host = process.env.HOST || 'localhost';

const services: Record<string, string> = {
  auth: `http://${host}:3001`,
  chat: `http://${host}:3002`,
  message: `http://${host}:3003`,
  presence: `http://${host}:3004`,
};

router.use('/:service/*', (req: Request, res: Response, next: NextFunction) => {
  const service = req.params.service;
  const target = services[service as keyof typeof services];
  if (!target) {
    return res.status(503).json({ message: 'Service not found' });
  }

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    pathRewrite: {
      [`^/${service}`]: '',
    },
    onError: (err: any, req: Request, res: Response) => {
      console.error(err);
      res.status(502).json({ message: `Proxy error on Service: ${service}`});
    },
    onProxyReq: (proxyReq: any, req: Request, res: Response) => {
      const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
      proxyReq.setHeader('x-correlation-id', correlationId);
      proxyReq.setHeader('x-forwarded-by', 'api-gateway');
    },
  });

  proxy(req, res, next);
});

export default router;
