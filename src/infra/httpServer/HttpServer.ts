import { EventEmitter } from 'node:events';
import Hapi from '@hapi/hapi';

import { requiredHeadersSchema, pingPayloadSchema } from '../../domain';
import {
  ProxyHandlerFn,
  ProxyHandlerResponse,
  IHttpServer,
  PostPingRequestDetails,
  ServerState,
  ServerStateEvent,
} from '../../domain/types';
import { INTERNAL_EVENTS, SERVICE_NAME, HEALTH_STATUSES } from '../../constants';
import * as dto from '../../dto';
import { HttpServerDeps, HealthcheckState, TlsOptions } from '../types';
import { createHttpsAgent, GRACEFUL_AGENT_SHUTDOWN_MS } from '../createHttpsAgent';
import { loggingPlugin } from './plugins';

export class HttpServer extends EventEmitter implements IHttpServer {
  private readonly server: Hapi.Server;
  // think if it's better to move state to PeerServer or ProxyService?
  private state: ServerState = {
    peerEndpoint: '',
    accessToken: '',
    httpsAgent: null,
  };
  private oldAgentShoutdownTimer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: HttpServerDeps) {
    super();
    this.server = this.createServer();
    this.initInternalEvents();
    this.state.peerEndpoint = deps.peerEndpoint;
  }

  async start(proxyHandler: ProxyHandlerFn): Promise<boolean> {
    const { logger } = this.deps;
    await this.registerPlugins();
    await this.registerRoutes(proxyHandler);
    logger.debug('plugins and routes are registered');
    await this.server.start();
    logger.verbose('httpServer is started', this.server.info);
    return true;
  }

  async stop(): Promise<boolean> {
    await this.server.stop();
    this.removeAllListeners(INTERNAL_EVENTS.serverState);
    if (this.oldAgentShoutdownTimer) clearTimeout(this.oldAgentShoutdownTimer);
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
    const details = dto.serverStateToHealthcheckDetailsDto(this.state);
    return Object.freeze({
      status: HEALTH_STATUSES.ok, // we check only if httpServer is up and running
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

  private async registerRoutes(proxyHandlerFn: ProxyHandlerFn) {
    const { logger, pingService } = this.deps;

    this.server.route([
      {
        method: 'GET',
        path: '/health',
        handler: async (_: Hapi.Request, h: Hapi.ResponseToolkit) => {
          const heathState = this.heathCheck();
          const statusCode = heathState.status === HEALTH_STATUSES.ok ? 200 : 502;
          return h.response(heathState).code(statusCode);
        },
      },
      {
        method: 'POST',
        path: '/ping',
        options: {
          // todo:  think if we should use Swagger (OpenAPI) for such validations
          validate: {
            headers: requiredHeadersSchema,
            payload: pingPayloadSchema,
            failAction: (_: Hapi.Request, h: Hapi.ResponseToolkit, err: Error | undefined) => {
              const errorObject = pingService.handleFailedValidation(err);
              return h.response(errorObject).code(400).takeover();
            },
          },
        },
        handler: async (req: Hapi.Request<{ Payload: PostPingRequestDetails['payload'] }>, h: Hapi.ResponseToolkit) => {
          const { success, errorObject } = pingService.handlePostPing(req);
          return h.response(errorObject).code(success ? 202 : 400);
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
        this.reCreateHttpsAgent(data.certs);
      }
    });
  }

  private createServer() {
    return new Hapi.Server(this.deps.serverConfig);
  }

  private reCreateHttpsAgent(certs: TlsOptions) {
    const { logger } = this.deps;
    const oldAgent = this.state.httpsAgent;

    this.state.httpsAgent = createHttpsAgent(certs);
    logger.verbose('httpsAgent with new certs is created');

    // gracefully shutdown old agent by waiting for in-flight requests to complete
    if (oldAgent) {
      this.oldAgentShoutdownTimer = setTimeout(() => {
        oldAgent.destroy();
        logger.debug('old httpsAgent destroyed after graceful period', { GRACEFUL_AGENT_SHUTDOWN_MS });
        this.oldAgentShoutdownTimer = null;
      }, GRACEFUL_AGENT_SHUTDOWN_MS);
    }
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
