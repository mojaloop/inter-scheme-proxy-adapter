import { isAxiosError, AxiosError } from 'axios';
import { IHttpClient, HttpRequestOptions, ProxyHandlerResponse } from '../domain/types';
import { HttpClientDeps } from './types';
import { DEFAULT_ERROR_STATUS_CODE } from '../constants';

export class HttpClient implements IHttpClient {
  constructor(private readonly deps: HttpClientDeps) {}

  async sendRequest(options: HttpRequestOptions): Promise<ProxyHandlerResponse> {
    const { axiosInstance, logger } = this.deps;
    const { httpsAgent, ...restOptions } = options;

    try {
      const result = await axiosInstance({
        ...restOptions,
        ...(httpsAgent && { httpsAgent }),
      });
      const { data, status, headers } = result;
      logger.verbose('proxy response received:', { data, status, headers });

      return { data, status, headers };
    } catch (err: unknown) {
      const errResponse = this.prepareErrorResponse(err);
      logger.warn('errResponse details:', errResponse);
      return errResponse;
    }
  }

  private prepareErrorResponse(err: unknown): ProxyHandlerResponse {
    this.deps.logger.error('proxy response error:', err);

    if (isAxiosError(err)) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        const { data, status, headers } = axiosError.response;
        return { data, status, headers };
      } else {
        const { message, status = DEFAULT_ERROR_STATUS_CODE } = axiosError;
        return { data: message, status };
      }
    }
    const data = err instanceof Error ? err.message : 'Unexpected proxy error';
    return { data, status: DEFAULT_ERROR_STATUS_CODE };
    // todo: think, how to handle error if no headers in error?
  }
}
