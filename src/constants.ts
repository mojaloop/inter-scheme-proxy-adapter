import { name, version } from '../package.json';

export const SERVICE_NAME = `${name}@${version}`;

export const PROXY_HEADER = 'FSPIOP-Proxy';
export const AUTH_HEADER = 'Authorization';

export const SCHEME = 'https'; // todo: use it through config

export const INTERNAL_EVENTS = {
  serverState: 'serverState',
} as const;
