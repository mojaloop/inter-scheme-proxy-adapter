import { ILogger } from '../../../domain';

export type ReqAppState = {
  context: {
    requestId: string;
    remoteAddress: string;
    path: string;
    method: string;
    received: number;
  };
};

export type PluginOptions = {
  logger: ILogger;
};
