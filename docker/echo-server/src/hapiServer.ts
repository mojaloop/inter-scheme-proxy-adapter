import Hapi from '@hapi/hapi';
import * as console from 'node:console';
import { PORT, DELAY_MS } from './config';

const start = async () => {
  const server = new Hapi.Server({
    host: '0.0.0.0',
    port: PORT,
  });

  server.route({
    method: '*',
    path: '/{path*}',
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
      const { method, path, payload, query, headers } = request;
      const req = {
        method,
        path,
        payload,
        query,
        headers,
      };
      console.log('request: ', req);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      return h.response(payload);
    },
  });
  await server.start();

  console.log('server started!', { PORT });
};

start().catch((err) => {
  console.error('server error:', err);
  process.exit(1);
});
