import Hapi from '@hapi/hapi';
import h2o2 from '@hapi/h2o2';
// import Wreck from '@hapi/wreck';
// import axios from 'axios';

import { ProxyHandlerFn, IHttpServer } from '../../domain/types';
import { httpRequest } from '../httpRequest';
import { HttpServerDeps } from '../types';
import { loggingPlugin } from './plugins';

// const wreck = Wreck.defaults({
//   agents: {
//     https: new https.Agent({ ca, cert, key }),
//     http: new http.Agent(),
//     httpsAllowUnauthorized: new https.Agent({ rejectUnauthorized: false }),
//   },
// });

export class HttpServer implements IHttpServer {
  private readonly server: Hapi.Server;
  // private readonly httpClient: typeof Wreck;

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
      h2o2,
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
        const { proxyDetails /*, proxyTlsAgent*/ } = this.deps;
        const { url, method, headers, payload } = request;

        const proxyTarget = await proxyHandlerFn({ url, headers, proxyDetails });

        // const axiosConfig = {
        //   ...proxyTarget,
        //   method,
        //   data: payload,
        //   responseType: 'stream' as axios.ResponseType, // think, how to avoid using 'as'
        //   ...(proxyTlsAgent ? { httpsAgent: proxyTlsAgent } : null),
        // };
        // logger.verbose('proxying request with axios...', { proxyTarget, payload });
        // const response = await axios(axiosConfig);
        // todo: move the logic to ISPAService

        const response = await httpRequest({
          url: proxyTarget.url,
          // headers: proxyTarget.headers,
          method,
          data: payload,
        });

        logger.debug('proxy response is ready');

        return h.response(response.data).code(response.status);
        // todo: think how to handle headers
      },
    });

    // this.server.route({
    //   method: '*',
    //   path: '/{path*}',
    //   handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    //     const { proxyDetails, proxyHttpClient } = this.deps;
    //     const { url } = request;
    //     const proxyTarget = await proxyHandlerFn({ url, proxyDetails });
    //     logger.verbose('proxying request...', proxyTarget);
    //
    //     return h.proxy({
    //       ...this.deps.proxyConfig,
    //       mapUri: () => proxyTarget,
    //       httpClient: proxyHttpClient,
    //     });
    //   },
    //   options: {
    //     payload: {
    //       // Cannot proxy if payload is parsed or if output is not stream or data
    //       output: 'stream',
    //       parse: false,
    //     },
    //   },
    // });

    logger.debug('proxy registered');
    return true;
  }
}
