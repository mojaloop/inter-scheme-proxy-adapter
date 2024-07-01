import config from '../../config';
import { IHttpServer, ILogger } from '../../domain';
import { HttpServer } from '../../infra';

type httpServersMap = Readonly<{
  httpServerA: IHttpServer;
  httpServerB: IHttpServer;
}>;

type createHttpServersDeps = {
  logger: ILogger;
};

export const createHttpServers = (deps: createHttpServersDeps): httpServersMap => {
  const httpServerA = new HttpServer({
    serverConfig: config.get('serverAConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl, // todo: rename to peerEndpoint
    },
    logger: deps.logger.child('serverA'),
  });

  const httpServerB = new HttpServer({
    serverConfig: config.get('serverBConfig'),
    proxyDetails: {
      baseUrl: config.get('hubBConfig').baseUrl, // todo: rename to peerEndpoint
    },
    logger: deps.logger.child('serverB'),
  });

  return Object.freeze({
    httpServerA,
    httpServerB,
  });
};
