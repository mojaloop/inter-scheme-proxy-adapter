import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

import { CA_CERT_PATH, SERVER_CERT_PATH, SERVER_KEY_PATH } from './config';

export const readCerds = () => {
  const serverCert = fs.readFileSync(path.join(__dirname, SERVER_CERT_PATH));
  const serverKey = fs.readFileSync(path.join(__dirname, SERVER_KEY_PATH));
  const caCert = fs.readFileSync(path.join(__dirname, CA_CERT_PATH));

  const options: https.ServerOptions = {
    cert: serverCert,
    key: serverKey,
    ca: caCert,
    requestCert: true,
    rejectUnauthorized: true,
  };

  return options;
};
