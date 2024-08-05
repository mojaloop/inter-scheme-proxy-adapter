import { EventEmitter } from 'node:events';
import { Agent } from 'node:https';
import Hapi from '@hapi/hapi';

import { ProxyHandlerFn, ProxyHandlerResponse, IHttpServer, ServerState, ServerStateEvent } from '../../domain/types';
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
    this.server = this.createServer();
    this.initInternalEvents();
  }

  async start(proxyHandler: ProxyHandlerFn): Promise<boolean> {
    const { logger } = this.deps;
    await this.registerPlugins();
    await this.registerProxy(proxyHandler);
    this.deps.logger.debug('plugins and routes are registered');
    await this.server.start();
    logger.verbose('httpServer is started', this.server.info);
    return true;
  }

  async stop(): Promise<boolean> {
    await this.server.stop();
    this.removeAllListeners(INTERNAL_EVENTS.serverState);
    this.deps.logger.verbose('httpServer is stopped');
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
    const { logger } = this.deps;

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
          const { peerEndpoint } = this.deps;
          const { url, method, headers, payload } = request;
          const reqDetails = {
            peerEndpoint, // todo: move out from reqDetails
            url,
            method,
            headers,
            payload,
          };
          logger.debug('incoming request details', reqDetails);

          const response = await proxyHandlerFn(reqDetails, this.state);
          return HttpServer.prepareHapiResponse(response, h);
        },
        options: {
          payload: {
            output: 'data',
            parse: false,
          },
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

  private createServer() {
    return new Hapi.Server(this.deps.serverConfig);
  }

  private static prepareHapiResponse(proxyResponse: ProxyHandlerResponse, h: Hapi.ResponseToolkit) {
    const { data, status, headers } = proxyResponse;
    const response = h.response(data || undefined).code(status);

    if (headers && typeof headers === 'object') {
      Object.entries(headers).forEach(([key, value]) => response.header(key, String(value)));
    }
    return response;
  }
}
