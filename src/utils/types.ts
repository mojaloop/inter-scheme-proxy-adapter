// prettier-ignore
export type Json =
  | string
  | number
  | boolean
  | { [x: string]: Json }
  | Array<Json>;

// todo: import from @mojaloop/central-services-logger
export const logLevelValues = ['error', 'warn', 'info', 'verbose', 'debug', 'silly', 'audit', 'trace', 'perf'] as const;
export type TLogLevels = (typeof logLevelValues)[number];

export type LogMeta = unknown; //  Json | Error | null;
export type LogContext = Json | string | null;

type LogMethod = (message: string, meta?: LogMeta) => void;
export type LogMethods = {
  [key in TLogLevels]: LogMethod;
} & {
  [isKey in `is${Capitalize<TLogLevels>}Enabled`]: boolean;
};
