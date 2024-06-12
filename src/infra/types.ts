import { type Agent } from 'node:https';
import { ILogger, ProxyDetails } from '../domain/types';

export type AppConfig = {
  DFSP_ID: string;
  LOG_LEVEL: string; // todo: use LogLevel type

  mtlsConfigA: MtlsConfig;
  mtlsConfigB: MtlsConfig;

  serverAConfig: ServerConfig;
  serverBConfig: ServerConfig;

  hubAConfig: HubConfig;
  hubBConfig: HubConfig;
};

type HubConfig = {
  // todo: think, if we need separate endpoints for ALS, QuotingService and ML-API-Adapter
  baseUrl: string;
};

type ServerConfig = {
  host: string;
  port: number;
};

export type MtlsConfig = {
  enabled: boolean;
  caCertPath: string;
  clientCertPath: string;
  clientKeyPath: string;
};

export type TlsOptions = Readonly<{
  ca: Buffer;
  cert: Buffer;
  key: Buffer;
}>;

export type ProxyTlsAgent = Agent | null;

export type HttpServerDeps = {
  serverConfig: ServerConfig;
  proxyDetails: ProxyDetails;
  proxyTlsAgent: ProxyTlsAgent; // todo: rename to httpsAgent
  logger: ILogger;
};
