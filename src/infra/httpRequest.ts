import https from 'node:https';
import axios from 'axios';

import config from '../config';
import { ProxyHandlerResponse } from '../domain/types';
import { loggerFactory } from '../utils';
import { ProxyTlsAgent } from './types';
import { readCertsFromFile } from './readCertsFromFile';

const logger = loggerFactory('httpRequest');

const createTlsProxyAgent = (): ProxyTlsAgent => {
  if (!config.get('mtlsConfig.enabled')) {
    return null;
  }
  logger.info('mTLS is enabled');
  const tlsOptions = readCertsFromFile();
  return new https.Agent(tlsOptions);
};

const httpsAgent = createTlsProxyAgent();

export type HttpRequestOptions = {
  url: string;
  method: string;
  // headers: Record<string, string>;
  data?: unknown;
};

export const httpRequest = async (options: HttpRequestOptions): Promise<ProxyHandlerResponse> => {
  try {
    const result = await axios({
      ...options,
      ...(httpsAgent && { httpsAgent }),
    });
    const { data, status, headers } = result;
    logger.verbose('proxy response:', { data, status, headers });

    return { data, status, headers };
  } catch (err: unknown) {
    logger.error('proxy request error:', err);
    return { data: null, status: 502 }; // think, if we need to provide headers
  }
};
