import { AxiosResponse } from 'axios';
import { IAuthClient, OIDCToken, OidcResponseData, AccessTokenUpdatesResult } from '../domain/types';
import { IN_ADVANCE_PERIOD_SEC } from '../constants';
import { DnsError } from '../errors';
import { AuthClientDeps } from './types';

type OidcHttpResponse = AxiosResponse<OIDCToken>;

export class AuthClient implements IAuthClient {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: AuthClientDeps) {}

  async getOidcToken(): Promise<OidcResponseData> {
    const { logger } = this.deps;
    try {
      const { data, status }: OidcHttpResponse = await this.sendRequest();
      logger.debug('oidcToken data received:', { data, status });

      if (!data.access_token || !data.expires_in) {
        throw new Error('Invalid response format from oidcToken endpoint');
      }
      return { oidcToken: data };
    } catch (error: unknown) {
      logger.error('error in getOidcToken:', error);
      return { oidcToken: null, error };
    }
  }

  async startAccessTokenUpdates(emitNewToken: (token: string) => void): Promise<AccessTokenUpdatesResult> {
    const { authConfig, logger } = this.deps;

    const oidcData = await this.getOidcToken();
    let updateTimeoutSec: number;

    if (!oidcData.oidcToken) {
      emitNewToken('');
      updateTimeoutSec = DnsError.isDnsRelatedError(oidcData.error)
        ? authConfig.retryDnsErrorTimeoutSec
        : authConfig.retryAccessTokenUpdatesTimeoutSec;
    } else {
      const { access_token, expires_in = Infinity } = oidcData.oidcToken;
      emitNewToken(access_token);
      updateTimeoutSec = Math.min(authConfig.accessTokenUpdateIntervalSec, expires_in) - IN_ADVANCE_PERIOD_SEC;
    }
    logger.verbose(`accessToken is ${oidcData.oidcToken ? '' : 'NOT '}updated, next time in:`, { updateTimeoutSec });
    this.timer = setTimeout(this.startAccessTokenUpdates.bind(this, emitNewToken), updateTimeoutSec * 1000);

    return this.makeAccessTokenUpdatesResult(oidcData);
  }

  stopUpdates() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.deps.logger.debug('accessToken updates stopped');
    }
  }

  private sendRequest(): Promise<OidcHttpResponse> {
    const { axiosInstance, logger } = this.deps;
    const httpOptions = this.createHttpOptions();
    logger.debug('sendRequest with httpOptions...', { httpOptions });
    return axiosInstance(httpOptions);
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

  private makeAccessTokenUpdatesResult(data: OidcResponseData): AccessTokenUpdatesResult {
    // prettier-ignore
    return data.oidcToken
      ? { success: true }
      : { success: false, error: data.error };
  }
}
