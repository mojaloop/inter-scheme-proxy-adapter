import stringify from 'fast-safe-stringify';
import mlLogger from '@mojaloop/central-services-logger';
/*
 Mojaloop Logger has several Typescript errors, coz it exports WinstonLogger type, but implements it badly:
  1. All 'is{Level}Enabled' should be functions (which return boolean), and NOT just boolean.
  2. Impl. has isPerfEnabled/perf, isAuditEnabled/audit, isTraceEnabled/trace methods, which don't exist on WinstonLogger type.
 */
import { ILogger } from '../domain';
import { LogContext, LogMeta, Json } from './types';

interface AnyError extends Error {
  code?: string;
  cause?: Error;
}

const makeLogString = (message: string, metaData?: unknown) => {
  return metaData ? `${message} - ${stringify(metaData)}` : message;
};

export const loggerFactory = (context?: LogContext): ILogger => new Logger(context);

export class Logger implements ILogger {
  private readonly mlLogger = mlLogger;
  private readonly context: LogContext;

  constructor(context: LogContext = null) {
    this.context = this.createContext(context);
  }

  error(message: string, meta?: LogMeta) {
    this.isErrorEnabled && this.mlLogger.error(this.formatLog(message, meta));
  }

  warn(message: string, meta?: LogMeta) {
    this.isWarnEnabled && this.mlLogger.warn(this.formatLog(message, meta));
  }

  info(message: string, meta?: LogMeta) {
    this.isInfoEnabled && this.mlLogger.info(this.formatLog(message, meta));
  }

  verbose(message: string, meta?: LogMeta) {
    this.isVerboseEnabled && this.mlLogger.verbose(this.formatLog(message, meta));
  }

  debug(message: string, meta?: LogMeta) {
    this.isDebugEnabled && this.mlLogger.debug(this.formatLog(message, meta));
  }

  silly(message: string, meta?: LogMeta) {
    this.isSillyEnabled && this.mlLogger.silly(this.formatLog(message, meta));
  }

  audit(message: string, meta?: LogMeta) {
    // @ts-expect-error TS2339: Property audit does not exist on type Logger
    this.isAuditEnabled && this.mlLogger.audit(this.formatLog(message, meta));
  }

  trace(message: string, meta?: LogMeta) {
    // @ts-expect-error TS2339: Property trace does not exist on type Logger
    this.isTraceEnabled && this.mlLogger.trace(this.formatLog(message, meta));
  }

  perf(message: string, meta?: LogMeta) {
    // @ts-expect-error TS2339: Property perf does not exist on type Logger
    this.isPerfEnabled && this.mlLogger.perf(this.formatLog(message, meta));
  }

  child(context: LogContext) {
    const childContext = this.createContext(context);
    return new Logger(Object.assign({}, this.context, childContext));
  }

  private formatLog(message: string, meta: LogMeta): string {
    if (!meta && !this.context) return makeLogString(message);
    // prettier-ignore
    const metaData = meta instanceof Error
      ? Logger.formatError(meta as AnyError)
      : typeof meta === 'object' ? meta : { meta };
    // try to add requestId from req (using AsyncLocalStorage)
    return makeLogString(message, Object.assign({}, metaData, this.context));
  }

  private createContext(context: LogContext): LogContext {
    // prettier-ignore
    return !context
      ? null
      : typeof context === 'object' ? context : {context};
  }

  // the next is{Level}Enabled props are to be able to follow the same logic: log.isDebugEnabled && log.debug(`some log message: ${data}`)

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isErrorEnabled: boolean = this.mlLogger.isErrorEnabled;

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isWarnEnabled: boolean = this.mlLogger.isWarnEnabled;

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isInfoEnabled: boolean = this.mlLogger.isInfoEnabled;

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isVerboseEnabled: boolean = this.mlLogger.isVerboseEnabled;

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isDebugEnabled: boolean = this.mlLogger.isDebugEnabled;

  // @ts-expect-error TS2322: Type () => boolean is not assignable to type boolean
  isSillyEnabled: boolean = this.mlLogger.isSillyEnabled;

  // @ts-expect-error TS2339: Property isAuditEnabled does not exist on type Logger
  isAuditEnabled: boolean = this.mlLogger.isAuditEnabled;

  // @ts-expect-error TS2339: Property isTraceEnabled does not exist on type Logger
  isTraceEnabled: boolean = this.mlLogger.isTraceEnabled;

  // @ts-expect-error TS2339: Property isPerfEnabled does not exist on type Logger
  isPerfEnabled: boolean = this.mlLogger.isPerfEnabled;

  static formatError(error: AnyError): Json {
    const { message, stack, code, cause } = error;

    return {
      message,
      ...(stack && { stack }),
      ...(code && { code }),
      ...(cause instanceof Error && { cause: Logger.formatError(cause as AnyError) }),
    };
  }
}
