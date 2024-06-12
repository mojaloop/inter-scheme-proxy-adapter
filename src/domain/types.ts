import { URL } from 'node:url';
import { ServerInfo, Server } from '@hapi/hapi';
import { INTERNAL_EVENTS } from '../constants';
import { ProxyTlsAgent } from '../infra/types';
import { LogMethods, LogContext } from '../utils/types';

type Headers = Record<string, string>;

export type ProxyDetails = {
  baseUrl: string;
};

export type ProxyTarget = {
  url: string;
  headers: Headers;
};

export type IncomingRequestDetails = {
  url: URL; // incoming url
  method: string;
  headers: Headers;
  payload?: unknown;
  proxyDetails: ProxyDetails;
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
}

export interface ISPAServiceInterface {
  getProxyTarget: (reqDetails: IncomingRequestDetails, state: ServerState) => ProxyTarget;
}

export type ISPADeps = {
  ispaService: ISPAServiceInterface;
  httpServerA: IHttpServer;
  httpServerB: IHttpServer;
  httpRequest: HttpRequest;
  logger: ILogger;
};

export type ISPAServiceDeps = {
  logger: ILogger;
  // todo: add axios instance here
};

export type HttpRequestOptions = {
  httpsAgent: ProxyTlsAgent;
  url: string;
  method: string;
  headers: Headers;
  data?: unknown; // rename to payload?
  // todo: add logger here
};

export type HttpRequest = (options: HttpRequestOptions) => Promise<ProxyHandlerResponse>;

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}

export type ServerState = {
  accessToken: string;
  httpsAgent: ProxyTlsAgent;
};

export interface IHttpServer {
  start: (proxyHandlerFn: ProxyHandlerFn) => Promise<boolean>;
  stop: () => Promise<boolean>;
  emit: (event: typeof INTERNAL_EVENTS.state, data: Partial<ServerState>) => boolean;
  info: ServerInfo; // think, if we need this
  hapiServer: Readonly<Server>; // for testing purposes
}
