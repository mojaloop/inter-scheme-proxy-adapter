import https from 'node:https';
import certs from '../certs/certs.json';
// import { SERVER_CERTS_FIELD } from './config';

export const readCerds = () => {
  const { ca, cert, key } = certs['server-localhost']; // todo: use SERVER_CERTS_FIELD

  const options: https.ServerOptions = {
    ca,
    cert,
    key,
    requestCert: true,
    rejectUnauthorized: true,
  };

  return options;
};
