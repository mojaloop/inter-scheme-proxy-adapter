import { LogMethods, LogContext } from '../utils/types';

export interface ILogger extends LogMethods {
  child(context?: LogContext): ILogger;
}
