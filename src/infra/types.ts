import { type Agent } from 'node:https';
import Wreck from '@hapi/wreck';
import { ILogger, ProxyDetails } from '../domain/types';
import { Client } from '#src/control-agent';

export type AppConfig = {
  PROXY_DFSP_ID: string;
  LOG_LEVEL: string; // todo: use LogLevel type

  mtlsConfig: MtlsConfig;
  proxyConfig: ProxyConfig;

  serverAConfig: ServerConfig;
  serverBConfig: ServerConfig;

  hubAConfig: HubConfig;
  hubBConfig: HubConfig;

  pm4mlEnabled: boolean;
};

type HubConfig = {
  // todo: think, if we need separate endpoints for ALS, QuotingService and ML-API-Adapter
  baseUrl: string;
};

type ProxyConfig = {
  passThrough: boolean;
  timeout: number;
};

type ServerConfig = {
  host: string;
  port: number;
  mgmtApi: MgtAPiConfig;
};

type MtlsConfig = {
  enabled: boolean;
  caCertPath: string;
  clientCertPath: string;
  clientKeyPath: string;
};

type MgtAPiConfig = {
  host: string;
  port: number;
};

export type TlsOptions = Readonly<{
  ca: Buffer;
  cert: Buffer;
  key: Buffer;
}>;

export type ProxyHttpClient = Partial<typeof Wreck>; // is used in ho2o proxy plugin

export type ProxyTlsAgent = Agent | null;

export type HttpServerDeps = {
  serverConfig: ServerConfig;
  proxyConfig: ProxyConfig; // todo: think, how to combine with ProxyDetails
  proxyDetails: ProxyDetails;
  // proxyHttpClient: ProxyHttpClient;
  proxyTlsAgent: ProxyTlsAgent;
  logger: ILogger;
  controlClient: Client | null;
};
