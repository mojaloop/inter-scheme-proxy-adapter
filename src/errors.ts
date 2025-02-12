import { AxiosError } from 'axios';

type AxiosErrorCode = string | undefined;

export class DnsError extends Error {
  static readonly DNS_RELATED_CODES: AxiosErrorCode[] = ['EAI_AGAIN', 'ENOTFOUND'];

  constructor(message: string, options: ErrorOptions) {
    super(message, options);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    // this.retryTimeoutSec = options.retryTimeoutSec;
  }

  static isDnsRelatedError(error: unknown): boolean {
    return error instanceof AxiosError && DnsError.DNS_RELATED_CODES.includes(error.code);
  }
}
