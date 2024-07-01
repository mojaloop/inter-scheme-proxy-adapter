import https from 'node:https';
import { serverCerts } from './config';

export const createTlsServerOptions = () => {
  const { ca, cert, key } = serverCerts;

  const options: https.ServerOptions = {
    ca,
    cert,
    key,
    requestCert: true,
    rejectUnauthorized: true,
  };

  return options;
};
