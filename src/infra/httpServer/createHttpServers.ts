import https from 'node:https';
// import http from 'node:http';
import Wreck from '@hapi/wreck';
import axios from 'axios';

import config from '../../config';
import { IHttpServer, ILogger } from '../../domain';
import { HttpServer, ProxyTlsAgent, ProxyHttpClient, readCertsFromFile } from '../../infra';

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

export const createHttpServers = (deps: createHttpServersDeps): httpServersMap => {
  const { logger } = deps;

  const httpServerA = new HttpServer({
    serverConfig: config.get('serverAConfig'),
    proxyConfig: config.get('proxyConfig'),
    proxyDetails: {
      baseUrl: config.get('hubBConfig').baseUrl,
    },
    // proxyHttpClient: createHttpClient(logger),
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverA'),
  });

  const httpServerB = new HttpServer({
    serverConfig: config.get('serverBConfig'),
    proxyConfig: config.get('proxyConfig'),
    proxyDetails: {
      baseUrl: config.get('hubAConfig').baseUrl,
    },
    // proxyHttpClient: createHttpClient(logger),
    proxyTlsAgent: createTlsProxyAgent(logger),
    logger: logger.child('serverB'),
  });

  return Object.freeze({
    httpServerA,
    httpServerB,
  });
};
