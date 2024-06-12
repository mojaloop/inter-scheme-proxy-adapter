import { URL } from 'node:url';
import { ServerInfo, Server } from '@hapi/hapi';
import { LogMethods, LogContext } from '../utils/types';

export type ProxyDetails = {
  baseUrl: string;
};

export type ProxyTarget = {
  url: string;
  headers: Headers;
};

type Headers = Record<string, string>;

export type ProxyHandlerInput = {
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

export type ProxyHandlerFn = (args: ProxyHandlerInput) => Promise<ProxyHandlerResponse>;

export interface iISPA {
  // todo: find better name
  start: () => Promise<void>;
  stop: () => Promise<void>;
  handleProxyRequest: ProxyHandlerFn;
}

export interface ISPAServiceInterface {
  getProxyTarget: (args: ProxyHandlerInput) => ProxyTarget;
}

export type ISPADeps = {
  ispaService: ISPAServiceInterface;
  httpServerA: IHttpServer;
  httpServerB: IHttpServer;
  logger: ILogger;
};

export type ISPAServiceDeps = {
  logger: ILogger;
  // todo: add axios instance here
};

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}

export interface IHttpServer {
  start: (proxyHandlerFn: ProxyHandlerFn) => Promise<boolean>;
  stop: () => Promise<boolean>;
  info: ServerInfo; // todo: think, if we need this
  hapiServer: Readonly<Server>; // for testing purposes
}
