import { URL } from 'node:url';
import { ServerInfo, Server } from '@hapi/hapi';
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

export type ProxyHandlerFn = (args: IncomingRequestDetails) => Promise<ProxyHandlerResponse>;

export interface IProxyAdapter {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  handleProxyRequest: ProxyHandlerFn;
}

export interface ISPAServiceInterface {
  getProxyTarget: (args: IncomingRequestDetails) => ProxyTarget;
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
  url: string;
  method: string;
  headers: Headers;
  data?: unknown; // rename to payload?
};

export type HttpRequest = (options: HttpRequestOptions) => Promise<ProxyHandlerResponse>;

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}

export interface IHttpServer {
  start: (proxyHandlerFn: ProxyHandlerFn) => Promise<boolean>;
  stop: () => Promise<boolean>;
  info: ServerInfo; // todo: think, if we need this
  hapiServer: Readonly<Server>; // for testing purposes
}
