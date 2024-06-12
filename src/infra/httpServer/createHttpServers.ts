import https from 'node:https';

import config from '../../config';
import { IHttpServer, ILogger } from '../../domain';
import { HttpServer, ProxyTlsAgent, readCertsFromFile } from '../../infra';

const createTlsProxyAgent = (logger: ILogger): ProxyTlsAgent => {
  if (!config.get('mtlsConfig.enabled')) {
    return null;
  }
  logger.verbose('mTLS is enabled');
  const tlsOptions = readCertsFromFile();

  return new https.Agent(tlsOptions);
};

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
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverA'),
  });

  const httpServerB = new HttpServer({
    serverConfig: config.get('serverBConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl,
    },
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverB'),
  });

  return Object.freeze({
    httpServerA,
    httpServerB,
  });
};
