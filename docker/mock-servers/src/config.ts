import process from 'node:process';
import certs from '../certs/certs.json';
// todo: use convict

export const certsJson = certs;
export type CertsFields = keyof typeof certsJson;

export const PORT = process.env.ECHO_PORT ?? 6000;
export const MTLS_PORT = process.env.ECHO_MTLS_PORT ?? 6443;
export const WS_PORT = parseInt(process.env.WS_PORT || '') || 4005;
export const OIDC_PORT = parseInt(process.env.OIDC_PORT || '') || 8080;

export const DELAY_MS = parseInt(process.env.ECHO_DELAY_MS || '') || 500;

export const {
  SERVER_CERTS_FIELD = 'server-localhost', // from certs.json
  CLIENT_CERTS_FIELD = 'client-localhost',
} = process.env;

export const serverCerts = certsJson[SERVER_CERTS_FIELD as CertsFields];
export const clientCerts = certsJson[CLIENT_CERTS_FIELD as CertsFields];
