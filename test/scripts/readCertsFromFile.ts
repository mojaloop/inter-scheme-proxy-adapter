import fs from 'node:fs';
import path from 'node:path';
import { TlsOptions } from '#src/types';

const CERTS_FOLDER = '../../certs';

export type MtlsConfig = {
  caCertPath: string;
  clientCertPath: string;
  clientKeyPath: string;
};

const readFileByName = (filename: string) => fs.readFileSync(path.join(__dirname, CERTS_FOLDER, filename));

export const readCertsFromFile = (mtlsConfig: MtlsConfig): TlsOptions => {
  const { caCertPath, clientCertPath, clientKeyPath } = mtlsConfig;

  const ca = readFileByName(caCertPath);
  const cert = readFileByName(clientCertPath);
  const key = readFileByName(clientKeyPath);

  return Object.freeze({
    ca,
    cert,
    key,
  });
};
