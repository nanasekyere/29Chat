import { describe, it, expect, vi } from 'vitest';
import { Options } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';


const { capturedOptions } = vi.hoisted(() => {
  const capturedOptions: Options[] = [];
  return { capturedOptions };
});

vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: (options: Options) => {
    capturedOptions.push(options);
    return (_req: any, _res: any, next: any) => next();
  },
  fixRequestBody: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import logger from '../../../src/utils/logger';

import '../../../src/middleware/proxy.middleware';

describe('proxy middleware', () => {
  describe('route registration', () => {
    it('creates proxies for all 4 services', () => {
      expect(capturedOptions).toHaveLength(4);
    });

    it('configures correct targets and path rewrites', () => {
      const [auth, chat, message, presence] = capturedOptions;

      expect(auth.target).toContain('3001');
      expect(auth.pathRewrite).toEqual({ '^/auth': '' });

      expect(chat.target).toContain('3002');
      expect(chat.pathRewrite).toEqual({ '^/chat': '' });

      expect(message.target).toContain('3003');
      expect(message.pathRewrite).toEqual({ '^/message': '' });

      expect(presence.target).toContain('3004');
      expect(presence.pathRewrite).toEqual({ '^/presence': '' });
    });

    it('sets 10s timeout on all proxies', () => {
      for (const options of capturedOptions) {
        expect(options.timeout).toBe(10000);
        expect(options.proxyTimeout).toBe(10000);
      }
    });

    it('enables changeOrigin on all proxies', () => {
      for (const options of capturedOptions) {
        expect(options.changeOrigin).toBe(true);
      }
    });
  });

  describe('proxyReq callback (header forwarding)', () => {
    function getProxyReqHandler() {
      return capturedOptions[0].on!.proxyReq as (
        proxyReq: ClientRequest,
        req: IncomingMessage,
        res: ServerResponse
      ) => void;
    }

    function createMockProxyReq() {
      return {
        setHeader: vi.fn(),
      } as unknown as ClientRequest;
    }

    function createMockIncomingReq(headers: Record<string, string | undefined> = {}) {
      return { headers } as unknown as IncomingMessage;
    }

    it('forwards authorization header when present', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({ authorization: 'Bearer token123' });

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith('authorization', 'Bearer token123');
    });

    it('forwards x-user-id header when present', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({ 'x-user-id': 'user-123' });

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith('x-user-id', 'user-123');
    });

    it('forwards x-user-email header when present', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({ 'x-user-email': 'test@test.com' });

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith('x-user-email', 'test@test.com');
    });

    it('does not forward authorization header when absent', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({});

      handler(proxyReq, req, {} as ServerResponse);

      const setHeaderCalls = (proxyReq.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const headerNames = setHeaderCalls.map((call) => call[0]);
      expect(headerNames).not.toContain('authorization');
    });

    it('adds x-correlation-id (generates UUID if missing)', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({});

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith(
        'x-correlation-id',
        expect.any(String)
      );
    });

    it('uses existing x-correlation-id if provided', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({ 'x-correlation-id': 'existing-id' });

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith('x-correlation-id', 'existing-id');
    });

    it('adds x-forwarded-by header with value "api-gateway"', () => {
      const handler = getProxyReqHandler();
      const proxyReq = createMockProxyReq();
      const req = createMockIncomingReq({});

      handler(proxyReq, req, {} as ServerResponse);

      expect(proxyReq.setHeader).toHaveBeenCalledWith('x-forwarded-by', 'api-gateway');
    });
  });

  describe('error callback', () => {
    function getErrorHandler(index = 0) {
      return capturedOptions[index].on!.error as (
        err: Error,
        req: IncomingMessage,
        res: ServerResponse
      ) => void;
    }

    it('returns 502 with service target in message', () => {
      const handler = getErrorHandler();
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      handler(
        new Error('ECONNREFUSED'),
        {} as IncomingMessage,
        res as unknown as ServerResponse
      );

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining('Proxy error on Service'),
      });
    });

    it('logs the proxy error', () => {
      const handler = getErrorHandler();
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      handler(
        new Error('ECONNREFUSED'),
        {} as IncomingMessage,
        res as unknown as ServerResponse,
      );

      expect(logger.error).toHaveBeenCalledWith('Proxy error', {
        error: 'ECONNREFUSED',
        target: expect.any(String),
      });
    });
  });
});
