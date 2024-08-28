import axios from 'axios';
import { IAuthClient, OIDCToken } from '../domain/types';
import { IN_ADVANCE_PERIOD_SEC } from '../constants';
import { AuthClientDeps } from './types';

type OIDCTokenResponse = axios.AxiosResponse<OIDCToken>;

export class AuthClient implements IAuthClient {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: AuthClientDeps) {}

  async getOidcToken(): Promise<OIDCToken | null> {
    const { logger } = this.deps;
    try {
      const { data, status }: OIDCTokenResponse = await this.sendRequest();
      logger.debug('oidc token data received:', { data, status });

      if (!data.access_token || !data.expires_in) {
        throw new Error('Invalid response format from token endpoint');
      }
      return data;
    } catch (err) {
      logger.error('error in getOidcToken:', err);
      return null;
    }
  }

  async startAccessTokenUpdates(emitNewToken: (token: string) => void): Promise<boolean> {
    const { authConfig, logger } = this.deps;

    const tokenData = await this.getOidcToken();
    let updateTimeoutSec: number;

    if (!tokenData) {
      emitNewToken('');
      updateTimeoutSec = authConfig.retryAccessTokenUpdatesTimeoutSec;
      // todo: think, if we need to stop after several failed retries
    } else {
      const { access_token, expires_in = Infinity } = tokenData;
      emitNewToken(access_token);
      updateTimeoutSec = Math.min(authConfig.accessTokenUpdateIntervalSec, expires_in) - IN_ADVANCE_PERIOD_SEC;
    }
    logger.verbose(`accessToken is ${tokenData ? '' : 'NOT '}updated, next time in:`, { updateTimeoutSec });
    this.timer = setTimeout(this.startAccessTokenUpdates.bind(this, emitNewToken), updateTimeoutSec * 1000);

    return !!tokenData;
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
    this.deps.logger.debug('sendRequest with httpOptions...', { httpOptions });
    return axios(httpOptions);
    // todo: try to use HttpClient as abstraction on top of axios lib (pass it through deps)
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
