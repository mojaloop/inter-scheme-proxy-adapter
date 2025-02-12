import axios from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { ILogger } from '../domain/types';

axios.defaults.headers.common = {}; // to avoid setting "accept"/"content-type" headers by default

type ConfigureDeps = {
  logger: ILogger;
  axiosConfig?: axios.CreateAxiosDefaults;
  retryConfig?: IAxiosRetryConfig;
};

type AxiosStatusCode = number | undefined;

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 50;
const RETRYABLE_STATUS_CODES: AxiosStatusCode[] = [502, 503, 504];

export const configureAxios = (deps: ConfigureDeps): axios.AxiosInstance => {
  const axiosInstance = axios.create(deps.axiosConfig);
  // prettier-ignore
  axiosRetry(axiosInstance, deps.retryConfig || {
    retries: DEFAULT_RETRIES,
    retryCondition: (err) => {
      const needRetry = RETRYABLE_STATUS_CODES.includes(err.status) || axiosRetry.isNetworkError(err);
      deps.logger.debug(`retryCondition - needRetry: ${needRetry}`, err);
      return needRetry;
    },
    retryDelay: () => DEFAULT_RETRY_DELAY_MS,
    onRetry: (retryCount, err) => {
      deps.logger.debug(`retrying HTTP request due to error [count: ${retryCount}]:`, err);
    },
    onMaxRetryTimesExceeded: (err, retryCount) => {
      deps.logger.info(`max retries exceeded on HTTP request [count: ${retryCount}]`, err);
    },
  });

  return axiosInstance;
};
