import process from 'node:process';
import { ServerState, IncomingRequestDetails, ProxyDetails, OIDCToken } from '#src/domain/types';
import { ICAPeerJWSCert, ICACerts } from '#src/infra/types';
import config from '#src/config';

export { default as certsJson } from '../docker/mock-servers/certs/certs.json';

// headers, which return mock hubServer
export const HUB_HEADERS: Record<string, string> = (process.env.HUB_HEADERS || '').split(';').reduce((acc, hv) => {
  const [header, value] = hv.split(',');
  if (!header || !value) throw new Error(`Invalid header value: ${hv}`);
  return { ...acc, [header]: value };
}, {});

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

export const peerJWSCertsDto = (): ICAPeerJWSCert[] => [
  { createdAt: 1721045192, dfspId: 'testdfsp1', publicKey: 'test peer JWS1' },
  { createdAt: 1721045208, dfspId: 'testdfsp2', publicKey: 'test peer JWS2' }
];

export const mtlsCertsDto = () => ({
  outbound: {
    tls: {
      creds: {
        cert: 'testCert',
        key: 'testKey',
        ca: 'testCA'
      }
    }
  }
});
