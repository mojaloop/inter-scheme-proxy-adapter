import { name, version } from '../package.json';

export const SERVICE_NAME = `${name}@${version}`;

export const PROXY_HEADER = 'fspiop-proxy';
export const AUTH_HEADER = 'Authorization';

export const SCHEME_HTTP = 'http';
export const SCHEME_HTTPS = 'https';

export const DEFAULT_ERROR_STATUS_CODE = 503;

export const INTERNAL_EVENTS = {
  serverState: 'serverState',
  peerJWS: 'peerJWS',
} as const;

export const HEALTH_STATUSES = {
  ok: 'OK',
  down: 'DOWN',
} as const;
