import axios from 'axios';
import { HttpRequestOptions, ProxyHandlerResponse } from '../domain/types';
import { loggerFactory } from '../utils';

const logger = loggerFactory('httpRequest');

// rename to proxyRequest
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
    return prepareErrorResponse(err);
  }
};

function prepareErrorResponse(err: unknown) {
  logger.error('proxy response error:', err);

  if (axios.isAxiosError(err)) {
    const axiosError = err as axios.AxiosError;
    if (axiosError.response) {
      const { data, status, headers } = axiosError.response;
      return { data, status, headers };
    } else {
      const { message, status = 502 } = axiosError;
      return { data: message, status };
    }
  }
  const data = err instanceof Error ? err.message : 'Unexpected proxy error';
  return { data, status: 502 };
  // todo: think, how to handle error if no headers in error? Do we need retries?
}
