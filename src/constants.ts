import { name, version } from '../package.json';

export const SERVICE_NAME = `${name}@${version}`;

export const PROXY_HEADER = 'fspiop-proxy'; // todo: use HEADERS_FSPIOP
export const AUTH_HEADER = 'Authorization';

export const HEADERS_FSPIOP = {
  // to avoid additional deps on central-services-shared
  SOURCE: 'fspiop-source',
  DESTINATION: 'fspiop-destination',
  PROXY: 'fspiop-proxy',
  SIGNATURE: 'fspiop-signature',
  // HTTP_METHOD: 'fspiop-http-method',
  // URI: 'fspiop-uri',
} as const;

export const SCHEME_HTTP = 'http';
export const SCHEME_HTTPS = 'https';

export const DEFAULT_ERROR_STATUS_CODE = 503;

export const IN_ADVANCE_PERIOD_SEC = 30; // time before accessToken expiration to update it

export const INTERNAL_EVENTS = {
  serverState: 'serverState',
  peerJWS: 'peerJWS',
} as const;

export const HEALTH_STATUSES = {
  ok: 'OK',
  down: 'DOWN',
} as const;

// todo: move sensitiveHeaders, hopByHopHeaders and xHeaders to sdk-standard-component
export const sensitiveHeaders = [
  'authorization',
  'cookie',
  'set-cookie',
  'host', // without removing host header request proxy fails with error: "Client network socket disconnected before secure TLS connection was established"
  'content-length', // without removing content-length header request just stuck
  'accept-encoding',
  'user-agent',
] as const;

export const hopByHopHeaders = [
  'connection',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'keep-alive',
] as const;

export const xHeaders = [
  'x-forwarded-proto',
  'x-request-id',
  'x-envoy-attempt-count',
  'x-forwarded-for',
  'x-forwarded-client-cert',
  'x-envoy-external-address',
  'x-envoy-decorator-operation',
  'x-envoy-peer-metadata',
  'x-envoy-peer-metadata-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
] as const;
