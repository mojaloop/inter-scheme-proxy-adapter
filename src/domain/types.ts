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
  peerEndpoint: string; // todo: shouldn't be a part of IncomingRequestDetails
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
  handleProxyRequest: ProxyHandlerFn;
  getDeps: () => ISPADeps; // for testing
}

export interface ISPAServiceInterface {
  getProxyTarget: (reqDetails: IncomingRequestDetails, state: ServerState) => ProxyTarget;
}

export type ISPADeps = {
  ispaService: ISPAServiceInterface;
  peerA: TPeerServer;
  peerB: TPeerServer;
  httpRequest: HttpRequest;
  logger: ILogger;
};

export type ISPAServiceDeps = {
  logger: ILogger;
  // maybe, move httpRequest (axios instance) here?
};

export type PeerLabel = 'A' | 'B';

export type TPeerServer = {
  start: (proxyHandlerFn: ProxyHandlerFn) => Promise<boolean>;
  stop: () => Promise<boolean>;
  on: (eventName: typeof INTERNAL_EVENTS.peerJWS, listener: (peerJWSEvent: PeerJWSEvent) => void) => void;
  propagatePeerJWSEvent: (peerJWSEvent: PeerJWSEvent) => void;
  // state: ServerState; // PeerState?
};

export type TPeerServerDeps = {
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

export type HttpRequest = (options: HttpRequestOptions) => Promise<ProxyHandlerResponse>;

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}

export type ServerState = {
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

export interface IAuthClient {
  startAccessTokenUpdates: (cb: (token: string) => void) => Promise<void>;
  stopUpdates: () => void;
  getOidcToken: () => Promise<OIDCToken>;
}

export type OIDCToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  [key: string]: unknown;
};
