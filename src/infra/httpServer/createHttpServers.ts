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
  const { logger } = deps;

  const httpServerA = new HttpServer({
    serverConfig: config.get('serverAConfig'),
    proxyDetails: {
      baseUrl: config.get('hubBConfig').baseUrl,
    },
    logger: logger.child('serverA'),
  });

  const httpServerB = new HttpServer({
    serverConfig: config.get('serverBConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl,
    },
    logger: logger.child('serverB'),
  });

  return Object.freeze({
    httpServerA,
    httpServerB,
  });
};
