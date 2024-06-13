import { Agent } from 'node:https';
import axios from 'axios';
import { IAuthClient, OIDCToken } from '../domain/types';
import { AuthClientDeps } from './types';

export class AuthClient implements IAuthClient {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: AuthClientDeps) {}

  async getOidcToken() {
    const httpOptions = this.createHttpOptions();
    const { data, status }: axios.AxiosResponse<OIDCToken> = await axios(httpOptions);
    // todo: think, if it's better to add abstraction on top of axios lib, and pass it through deps

    this.deps.logger.debug('oidc token received:', { data, status });
    if (!data.access_token || !data.expires_in) {
      throw new Error('Invalid response from token endpoint');
      // todo: think if we need to throw an error OR just log it and return null
    }
    return data;
  }

  async startAccessTokenUpdates(emit: (token: string) => void) {
    const { access_token, expires_in = Infinity } = await this.getOidcToken();
    emit(access_token);

    const { refreshSeconds, tokenEndpoint } = this.deps.authConfig;
    const updateTimeoutSec = Math.min(refreshSeconds, expires_in);
    this.deps.logger.verbose('accessToken updated, waiting for next updates...', { updateTimeoutSec, tokenEndpoint });

    this.timer = setTimeout(this.startAccessTokenUpdates.bind(this, emit), refreshSeconds * 1000);
  }

  stopUpdates() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.deps.logger.debug('accessToken updates stopped');
    }
  }

  private createHttpOptions() {
    const { tokenEndpoint, clientKey, clientSecret } = this.deps.authConfig;
    const basicToken = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64');

    return Object.freeze({
      url: tokenEndpoint,
      httpsAgent: new Agent(), // think, if we need mTLS or http
      method: 'POST',
      data: {
        grant_type: 'client_credentials',
      },
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }
}
