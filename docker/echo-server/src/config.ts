import process from 'node:process';

export const PORT = process.env.ECHO_PORT ?? 6000;
export const MTLS_PORT = process.env.ECHO_MTLS_PORT ?? 6443;
export const DELAY_MS = parseInt(process.env.ECHO_DELAY_MS || '') || 500;

const CERTS_FOLDER = '../certs';

export const {
  SERVER_CERT_PATH = `${CERTS_FOLDER}/server-cert.pem`,
  SERVER_KEY_PATH = `${CERTS_FOLDER}/server-key.pem`,
  CA_CERT_PATH = `${CERTS_FOLDER}/ca-cert.pem`,
} = process.env;
