import axios from 'axios';
import { IAuthClient, OIDCToken } from '../domain/types';
import { AuthClientDeps } from './types';

type OIDCTokenResponse = axios.AxiosResponse<OIDCToken>;

export class AuthClient implements IAuthClient {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: AuthClientDeps) {}

  async getOidcToken() {
    const { data, status }: OIDCTokenResponse = await this.sendRequest();
    this.deps.logger.debug('oidc token received:', { data, status });

    if (!data.access_token || !data.expires_in) {
      throw new Error('Invalid response from token endpoint');
      // todo: think if we need to throw an error OR just log it and return null
    }
    return data;
  }

  async startAccessTokenUpdates(emitNewToken: (token: string) => void) {
    const { access_token, expires_in = Infinity } = await this.getOidcToken();
    emitNewToken(access_token);

    const { refreshSeconds, tokenEndpoint } = this.deps.authConfig;
    const updateTimeoutSec = Math.min(refreshSeconds, expires_in);
    this.deps.logger.verbose('accessToken updated, waiting for next updates...', { updateTimeoutSec, tokenEndpoint });

    this.timer = setTimeout(this.startAccessTokenUpdates.bind(this, emitNewToken), updateTimeoutSec * 1000);
  }

  stopUpdates() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.deps.logger.debug('accessToken updates stopped');
    }
  }

  private sendRequest(): Promise<OIDCTokenResponse> {
    const httpOptions = this.createHttpOptions();
    return axios(httpOptions);
    // todo: think, if it's better to add abstraction on top of axios lib, and pass it through deps
  }

  private createHttpOptions() {
    const { tokenEndpoint, clientKey, clientSecret } = this.deps.authConfig;
    const basicToken = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64');

    return Object.freeze({
      url: tokenEndpoint,
      method: 'POST',
      data: {
        grant_type: 'client_credentials',
      },
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // add httpsAgent, if we need mTLS
    });
  }
}