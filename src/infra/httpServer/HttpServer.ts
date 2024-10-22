import { EventEmitter } from 'node:events';
import { Agent } from 'node:https';
import Hapi from '@hapi/hapi';

import { ProxyHandlerFn, ProxyHandlerResponse, IHttpServer, ServerState, ServerStateEvent } from '../../domain/types';
import { INTERNAL_EVENTS, SERVICE_NAME, HEALTH_STATUSES } from '../../constants';
import * as dto from '../../dto';
import { HttpServerDeps, HealthcheckState } from '../types';
import { loggingPlugin } from './plugins';


export class HttpServer extends EventEmitter implements IHttpServer {
  private readonly server: Hapi.Server;
  // think, if it's better to move state to PeerServer or ProxyService?
  private state: ServerState = {
    peerEndpoint: '',
    accessToken: '',
    httpsAgent: null,
  };

  constructor(private readonly deps: HttpServerDeps) {
    super();
    this.server = this.createServer();
    this.initInternalEvents();
    this.state.peerEndpoint = deps.peerEndpoint;
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

  heathCheck(): HealthcheckState {
    // todo: think, if we need to ping peerEndpoint?
    const details = dto.serverStateToHealthcheckDetailsDto(this.state);
    return Object.freeze({
      status: details.isReady ? HEALTH_STATUSES.ok : HEALTH_STATUSES.down,
      details,
      startTime: new Date(this.server.info.created).toISOString(),
      versionNumber: SERVICE_NAME,
    });
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
          const heathState = this.heathCheck();
          const statusCode = heathState.status === HEALTH_STATUSES.ok ? 200 : 502;
          return h.response(heathState).code(statusCode);
        },
      },
      {
        method: '*',
        path: '/{any*}',
        handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
          const { url, method, headers, payload } = request;
          const reqDetails = {
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

    // think, if it's better to have a separate event for each state change?
    this.on(INTERNAL_EVENTS.serverState, (data: ServerStateEvent) => {
      if (!data) return;

      if (typeof data.accessToken === 'string') {
        this.state.accessToken = data.accessToken;
        logger.debug('accessToken is updated', data);
      }

      if (data.certs) {
        this.state.httpsAgent = new Agent(data.certs);
        logger.verbose('httpsAgent with new certs is created');
      }
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
