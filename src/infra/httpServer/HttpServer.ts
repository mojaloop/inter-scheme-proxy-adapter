import { EventEmitter } from 'node:events';
import { Agent } from 'node:https';
import Hapi from '@hapi/hapi';

import { ProxyHandlerFn, IHttpServer, ServerState, ServerStateEvent } from '../../domain/types';
import { INTERNAL_EVENTS } from '../../constants';
import { HttpServerDeps } from '../types';
import { loggingPlugin } from './plugins';

export class HttpServer extends EventEmitter implements IHttpServer {
  private readonly server: Hapi.Server;
  private state: ServerState = {
    accessToken: '',
    httpsAgent: null,
  };

  constructor(private readonly deps: HttpServerDeps) {
    super();
    this.server = new Hapi.Server(deps.serverConfig);
    this.initInternalEvents();
  }

  async start(proxyHandler: ProxyHandlerFn): Promise<boolean> {
    const { logger } = this.deps;
    await this.registerPlugins();
    await this.registerProxy(proxyHandler);
    this.deps.logger.debug('plugins and routes are registered');
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
  }

  private async registerProxy(proxyHandlerFn: ProxyHandlerFn) {
    this.server.route([
      {
        method: 'GET',
        path: '/health',
        handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
          // todo: think about healthCheck logic
          return h.response({ success: true }).code(200);
        },
      },
      {
        method: '*',
        path: '/{any*}',
        handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
          const { proxyDetails } = this.deps;
          const { url, method, headers, payload } = request;

          const reqDetails = {
            proxyDetails, // todo: move it to serverState
            url,
            method,
            headers,
            payload,
          };
          const response = await proxyHandlerFn(reqDetails, this.state); // or better { ...this.state }?

          return h.response(response.data || undefined).code(response.status);
          // todo: think how to handle headers
        },
      },
    ]);
  }

  private initInternalEvents() {
    const { logger } = this.deps;

    this.on(INTERNAL_EVENTS.serverState, (data: ServerStateEvent) => {
      if (!data) return;

      if (data.accessToken) {
        this.state.accessToken = data.accessToken;
        logger.debug('accessToken is updated', data.accessToken);
      }

      if (data.certs) {
        this.state.httpsAgent = new Agent(data.certs);
        logger.verbose('httpsAgent with new certs is created');
      }
      // todo: think, if it's better to have:
      //   - a separate event for each state change
      //   - a separate method for each state change
    });
  }
}
