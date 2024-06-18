import process from 'node:process';
// todo: use convict

export const PORT = process.env.ECHO_PORT ?? 6000;
export const MTLS_PORT = process.env.ECHO_MTLS_PORT ?? 6443;
export const WS_PORT = parseInt(process.env.WS_PORT || '') || 4005;
export const OIDC_PORT = parseInt(process.env.OIDC_PORT || '') || 8080;

export const DELAY_MS = parseInt(process.env.ECHO_DELAY_MS || '') || 500;
