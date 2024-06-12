import { ServerState, IncomingRequestDetails, ProxyDetails } from '#src/domain/types';
import config from '#src/config';

// prettier-ignore
export const serverStateDto = ({
  accessToken = 'testAccessToken'
} = {}): ServerState => ({
  accessToken,
});

// prettier-ignore
export const proxyDetailsDto = ({
  baseUrl = config.get('hubAConfig.baseUrl')
} = {}): ProxyDetails => ({
  baseUrl,
});

export const requestDetailsDto = ({
  method = 'GET',
  schema = 'https',
  host = 'localhost',
  port = 12345,
  path = 'test-path',
  query = 'query=test',
  headers = { h1: 'testHeader' },
  proxyDetails = proxyDetailsDto(),
} = {}): IncomingRequestDetails => ({
  url: new URL(`${schema}://${host}:${port}/${path}?${query}`),
  method,
  headers,
  proxyDetails,
});
