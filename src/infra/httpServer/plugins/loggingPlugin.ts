import { randomUUID } from 'node:crypto';
import { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import { ReqAppState, PluginOptions } from './types';

const TRACE_ID_FIELD = 'traceid';

export const loggingPlugin: Plugin<PluginOptions> = {
  name: 'loggingPlugin',
  version: '1.0.0',
  once: true,
  register: async (server, options) => {
    const { logger } = options;

    server.ext({
      type: 'onRequest',
      method: (req: Request, h: ResponseToolkit) => {
        const { path, method } = req;
        const { id, remoteAddress, received } = req.info;
        const context = {
          requestId: `${id}__${req.headers[TRACE_ID_FIELD] || randomUUID()}`,
          remoteAddress,
          path,
          method,
          received,
        };
        Object.assign(req.app, { context });
        logger.info(`[==> req] ${method.toUpperCase()} ${path}`, context);

        return h.continue;
      },
    });

    server.ext({
      type: 'onPreResponse',
      method: (req: Request, h: ResponseToolkit) => {
        const { path, method, response } = req;
        const { context } = req.app as ReqAppState; // todo: think, how to specify req.app type
        const responseTimeSec = ((Date.now() - context.received) / 1000).toFixed(3);

        const statusCode = response instanceof Error ? response.output.statusCode : response.statusCode;
        logger.info(`[<== ${statusCode}][${responseTimeSec} s] ${method.toUpperCase()} ${path}`, context);

        return h.continue;
      },
    });
  },
};
