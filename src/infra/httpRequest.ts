// import https from 'node:https';
import axios from 'axios';
import { HttpRequestOptions, ProxyHandlerResponse } from '../domain/types';
import { loggerFactory } from '../utils';

const logger = loggerFactory('httpRequest');

// todo: rename to proxyRequest
export const httpRequest = async (options: HttpRequestOptions): Promise<ProxyHandlerResponse> => {
  const { httpsAgent, ...restOptions } = options;

  try {
    const result = await axios({
      ...restOptions,
      ...(httpsAgent && { httpsAgent }),
    });
    const { data, status, headers } = result;
    logger.verbose('proxy response received:', { data, status, headers });

    return { data, status, headers };
  } catch (err: unknown) {
    logger.error('proxy response error:', err);
    return { data: null, status: 502 }; // think, if we need to provide headers
  }
};
