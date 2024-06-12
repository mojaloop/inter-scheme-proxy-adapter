import https from 'node:https';

import config from '../../config';
import { IHttpServer, ILogger } from '../../domain';
import { HttpServer, ProxyTlsAgent, readCertsFromFile } from '../../infra';
import { Client } from '#src/control-agent';

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

export const createHttpServers = async (deps: createHttpServersDeps): Promise<httpServersMap> => {
  const { logger } = deps;
  const serverAConfig = config.get('serverAConfig');
  const httpServerA = new HttpServer({
    serverConfig: config.get('serverAConfig'),
    proxyDetails: {
      baseUrl: config.get('hubBConfig').baseUrl,
    },
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverA'),
    controlClient: config.get('pm4mlEnabled') ? await Client.Create({ 
      address: serverAConfig.mgmtApi.host, 
      port: serverAConfig.mgmtApi.port, 
      logger, 
      appConfig: config.get() 
    }) : null,
  });

  const serverBConfig = config.get('serverBConfig');
  const httpServerB = new HttpServer({
    serverConfig: config.get('serverBConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl,
    },
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverB'),
    controlClient: config.get('pm4mlEnabled') ? await Client.Create({ 
      address: serverBConfig.mgmtApi.host, 
      port: serverBConfig.mgmtApi.port, 
      logger, 
      appConfig: config.get() 
    }) : null,
  });

  return Object.freeze({
    httpServerA,
    httpServerB,
  });
};
