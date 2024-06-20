import { ServerState, IncomingRequestDetails, ProxyDetails, OIDCToken } from '#src/domain/types';
import config from '#src/config';

export { default as certsJson } from '../docker/mock-servers/certs/certs.json';

// prettier-ignore
export const serverStateDto = ({
  accessToken = 'testAccessToken',
  httpsAgent = null,
} = {}): ServerState => ({
  accessToken,
  httpsAgent,
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

export const oidcTokenDto = ({
  access_token = 'accessToken',
  expires_in = Date.now() + 60 * 60,
  token_type = 'tokenType',
  scope = 'email',
} = {}): OIDCToken => ({
  access_token,
  expires_in,
  token_type,
  scope,
});
