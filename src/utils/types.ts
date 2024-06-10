// prettier-ignore
export type Json =
  | string
  | number
  | boolean
  | { [x: string]: Json }
  | Array<Json>;

// todo: import from @mojaloop/central-services-logger
export type TLogLevels = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly' | 'audit' | 'trace' | 'perf';

export type LogMeta = unknown; //  Json | Error | null;
export type LogContext = Json | string | null;

type LogMethod = (message: string, meta?: LogMeta) => void;
export type LogMethods = {
  [key in TLogLevels]: LogMethod;
} & {
  [isKey in `is${Capitalize<TLogLevels>}Enabled`]: boolean;
};
