import Hapi from '@hapi/hapi';

import { ProxyHandlerFn, IHttpServer } from '../../domain/types';
import { HttpServerDeps } from '../types';
import { loggingPlugin } from './plugins';

export class HttpServer implements IHttpServer {
  private readonly server: Hapi.Server;

  constructor(private readonly deps: HttpServerDeps) {
    this.server = new Hapi.Server(deps.serverConfig);
  }

  async start(proxyHandler: ProxyHandlerFn): Promise<boolean> {
    const { logger } = this.deps;
    await this.registerPlugins();
    await this.registerProxy(proxyHandler);
    await this.server.start();
    logger.verbose('http-server is listening', this.server.info);
    return true;
  }

  async stop(): Promise<boolean> {
    await this.server.stop();
    this.deps.logger.verbose('http-server is stopped');
    return true;
  }

  get info(): Hapi.ServerInfo {
    return this.server.info;
  }

  get hapiServer(): Hapi.Server {
    return this.server;
  }

  private async registerPlugins() {
    const { logger } = this.deps;
    const plugins = [
      {
        plugin: loggingPlugin,
        options: { logger },
      },
      // add any other plugins here, e.g. error handling, etc.
    ];
    await this.server.register(plugins);

    logger.debug('plugins registered');
    return true;
  }

  private async registerProxy(proxyHandlerFn: ProxyHandlerFn) {
    const { logger } = this.deps;

    this.server.route({
      method: '*',
      path: '/{path*}',
      handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
        const { proxyDetails } = this.deps;
        const { url, method, headers, payload } = request;

        const response = await proxyHandlerFn({
          proxyDetails,
          url,
          method,
          headers,
          payload,
        });

        return h.response(response.data || undefined).code(response.status);
        // todo: think how to handle headers
      },
    });

    logger.debug('proxy route registered');
    return true;
  }
}
