import { name, version } from '../package.json';

export const SERVICE_NAME = `${name}@${version}`;

export const HEADERS_FSPIOP = {
  // to avoid additional deps on central-services-shared
  SOURCE: 'fspiop-source',
  DESTINATION: 'fspiop-destination',
  PROXY: 'fspiop-proxy',
  SIGNATURE: 'fspiop-signature',
  // HTTP_METHOD: 'fspiop-http-method',
  // URI: 'fspiop-uri',
} as const;

export const AUTH_HEADER = 'Authorization';

export const SCHEME_HTTP = 'http';
export const SCHEME_HTTPS = 'https';

export const DEFAULT_ERROR_STATUS_CODE = 503;

export const IN_ADVANCE_PERIOD_SEC = 30; // time before accessToken expiration to update it

export const INTERNAL_EVENTS = {
  peerJWS: 'peerJWS',
  serverState: 'serverState',
  tlsCreds: 'tlsCreds',
} as const;

export const HEALTH_STATUSES = {
  ok: 'OK',
  down: 'DOWN',
} as const;
