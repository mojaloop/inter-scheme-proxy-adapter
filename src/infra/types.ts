import { type Agent } from 'node:https';
import { ILogger, ProxyDetails } from '../domain/types';

export type AppConfig = {
  PROXY_ID: string;
  LOG_LEVEL: string; // todo: use LogLevel type

  mtlsConfigA: MtlsConfig;
  mtlsConfigB: MtlsConfig;

  authConfigA: AuthConfig;
  authConfigB: AuthConfig;

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

export type AuthConfig = {
  tokenEndpoint: string;
  clientKey: string; // or rename it to clientId?
  clientSecret: string;
  refreshSeconds: number;
  // think, if we need to add mTlsEnabled option
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
  logger: ILogger;
};

export type AuthClientDeps = {
  authConfig: AuthConfig;
  // httpClient: HttpClient; // axios
  logger: ILogger;
};
