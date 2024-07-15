import { type Agent } from 'node:https';
import { ILogger, ProxyDetails } from '../domain/types';

export * from './controlAgent/types';

export type AppConfig = {
  PROXY_ID: string;
  LOG_LEVEL: string; // todo: use LogLevel type

  authConfigA: AuthConfig;
  authConfigB: AuthConfig;

  serverAConfig: ServerConfig;
  serverBConfig: ServerConfig;

  hubAConfig: HubConfig;
  hubBConfig: HubConfig;

  controlAgentAConfig: ControlAgentConfig;
  controlAgentBConfig: ControlAgentConfig;

  pm4mlEnabled: boolean;
  incomingHeadersRemoval: string[];
  checkPeerJwsInterval: number;
};

type HubConfig = {
  // todo: move to ServerConfig
  baseUrl: string;
};

type ServerConfig = {
  // todo: rename to ProxyServerConfig
  host: string;
  port: number;
};

type ControlAgentConfig = {
  wsHost: string;
  wsPort: number;
  timeout: number;
};

export type AuthConfig = {
  tokenEndpoint: string;
  clientKey: string; // or rename it to clientId?
  clientSecret: string;
  refreshSeconds: number;
  // think, if we need to add mTlsEnabled option
};

export type TlsOptions = Readonly<{
  ca: string | Buffer;
  cert: string | Buffer;
  key: string | Buffer;
}>;
// think, if we need to leave only string?

export type ProxyTlsAgent = Agent | null;

export type HttpServerDeps = {
  serverConfig: ServerConfig;
  proxyDetails: ProxyDetails;
  logger: ILogger;
};

export type AuthClientDeps = {
  authConfig: AuthConfig;
  logger: ILogger;
  // httpClient: HttpClient; // axios
};
