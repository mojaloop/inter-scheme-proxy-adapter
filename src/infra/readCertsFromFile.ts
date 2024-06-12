import fs from 'node:fs';
import path from 'node:path';
import config from '../config';
import { TlsOptions } from './types';

const CERTS_FOLDER = '../../certs';
const readFileByName = (filename: string) => fs.readFileSync(path.join(__dirname, CERTS_FOLDER, filename));

export const readCertsFromFile = (): TlsOptions => {
  const { caCertPath, clientCertPath, clientKeyPath } = config.get('mtlsConfig');
  // todo: rename env var to ...Filename

  const ca = readFileByName(caCertPath);
  const cert = readFileByName(clientCertPath);
  const key = readFileByName(clientKeyPath);

  return Object.freeze({
    ca,
    cert,
    key,
  });
};
