import https from 'node:https';
// import http from 'node:http';
import Wreck from '@hapi/wreck';
import axios from 'axios';

import config from '../../config';
import { IHttpServer, ILogger } from '../../domain';
import { HttpServer, ProxyTlsAgent, ProxyHttpClient, readCertsFromFile } from '../../infra';
import { Client } from '#src/control-agent';

const createTlsProxyAgent = (logger: ILogger): ProxyTlsAgent => {
  if (!config.get('mtlsConfig.enabled')) {
    return null;
  }
  logger.verbose('mTLS is enabled');
  const tlsOptions = readCertsFromFile();

  return new https.Agent(tlsOptions);
};

// eslint-disable-next-line
const createHttpClient = (logger: ILogger): ProxyHttpClient => {
  if (!config.get('mtlsConfig.enabled')) {
    return Wreck;
  }
  logger.verbose('mTLS is enabled');
  const { ca, cert, key } = readCertsFromFile();
  // todo: think, if we can use the same tlsOptions for both servers

  // const wreck = Wreck.defaults({
  //   agents: {
  //     https: new https.Agent({ ca, cert, key }),
  //     http: new http.Agent(),
  //     httpsAllowUnauthorized: new https.Agent({ rejectUnauthorized: false }),
  //   },
  // });

  const httpsAgent = new https.Agent({ ca, cert, key });

  return {
    // request: wreck.request.bind(wreck),

    // @ts-expect-error TS2322: Type
    request(method, url) {
      return axios({
        method,
        url,
        httpsAgent,
      });
    },
  };
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
    serverConfig: serverAConfig,
    proxyConfig: config.get('proxyConfig'),
    proxyDetails: {
      baseUrl: config.get('hubBConfig').baseUrl,
    },
    // proxyHttpClient: createHttpClient(logger),
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
    serverConfig: serverBConfig,
    proxyConfig: config.get('proxyConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl,
    },
    // proxyHttpClient: createHttpClient(logger),
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
