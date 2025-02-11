import { AxiosError } from 'axios';

export class DnsError extends Error {
  constructor(message: string, options: ErrorOptions) {
    super(message, options);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    // this.retryTimeoutSec = options.retryTimeoutSec;
  }

  static isDnsRelatedError(error: unknown): boolean {
    return error instanceof AxiosError && error.message.startsWith('getaddrinfo ENOTFOUND');
  }
}
