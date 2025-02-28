import { URL } from 'node:url';
import { ServerInfo, Server } from '@hapi/hapi';
import { INTERNAL_EVENTS } from '../constants';
import { ProxyTlsAgent, IControlAgent, TlsOptions, ICAPeerJWSCert } from '../infra/types';
import { LogMethods, LogContext } from '../utils/types';

type Headers = Record<string, string>; // check, why it doesn't work with Json

export type ProxyTarget = {
  url: string;
  headers: Headers;
};

export type IncomingRequestDetails = {
  url: URL; // incoming url
  method: string;
  headers: Headers;
  payload?: unknown;
};

export type ProxyHandlerResponse = {
  status: number;
  data: unknown;
  headers?: unknown;
};

export type ProxyHandlerFn = (
  reqDetails: IncomingRequestDetails,
  serverState: ServerState,
) => Promise<ProxyHandlerResponse>;

export interface IProxyAdapter {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getDeps: () => ISPADeps; // for testing
}

export interface IProxyService {
  sendProxyRequest: (reqDetails: IncomingRequestDetails, state: ServerState) => Promise<ProxyHandlerResponse>;
  getProxyTarget: (reqDetails: IncomingRequestDetails, state: ServerState) => ProxyTarget;
}

export type ISPADeps = {
  peerA: TPeerServer;
  peerB: TPeerServer;
  logger: ILogger;
};

export type ProxyServiceDeps = {
  httpClient: IHttpClient;
  logger: ILogger;
};

export type PeerLabel = 'A' | 'B';

export type TPeerServer = {
  handleProxyRequest: ProxyHandlerFn;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  on: (eventName: typeof INTERNAL_EVENTS.peerJWS, listener: (peerJWSEvent: PeerJWSEvent) => void) => void;
  propagatePeerJWSEvent: (peerJWSEvent: PeerJWSEvent) => boolean;
  // state: ServerState; // PeerState?
};

export type TPeerServerDeps = {
  proxyService: IProxyService;
  httpServer: IHttpServer;
  authClient: IAuthClient;
  controlAgent: IControlAgent;
  logger: ILogger;
};

export type HttpRequestOptions = {
  httpsAgent: ProxyTlsAgent;
  url: string;
  method: string;
  headers: Headers;
  data?: unknown; // rename to payload?
  // add logger here?
};

export interface IHttpClient {
  sendRequest: (options: HttpRequestOptions) => Promise<ProxyHandlerResponse>;
}

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}

export type ServerState = {
  peerEndpoint: string;
  accessToken: string;
  httpsAgent: ProxyTlsAgent;
};

export type ServerStateEvent = Partial<{
  accessToken: string;
  certs: TlsOptions;
}>;
// todo: define that, at least, one of the fields should be present

export type PeerJWSEvent = {
  peerJWS: ICAPeerJWSCert[];
};

export interface IHttpServer {
  start: (proxyHandlerFn: ProxyHandlerFn) => Promise<boolean>;
  stop: () => Promise<boolean>;
  emit: (event: typeof INTERNAL_EVENTS.serverState, data: ServerStateEvent) => boolean;
  // think, if it's better to emit separate events for each state change
  info: ServerInfo; // think, if we need this
  hapiServer: Readonly<Server>; // for testing purposes
}

export type OidcResponseData =
  | {
      oidcToken: OIDCToken;
    }
  | {
      oidcToken: null;
      error: unknown;
    };

export type AccessTokenUpdatesResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: Error; // Error or any of its descendant
    };

export interface IAuthClient {
  getOidcToken: () => Promise<OidcResponseData>;
  startAccessTokenUpdates: (cb: (token: string) => void) => Promise<AccessTokenUpdatesResult>;
  stopUpdates: () => void;
}

export type OIDCToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  [key: string]: unknown;
};
