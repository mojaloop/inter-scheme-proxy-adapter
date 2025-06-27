import config from '../config';
import * as dto from '../dto';
import { PROXY_HEADER, AUTH_HEADER, SCHEME_HTTP, SCHEME_HTTPS } from '../constants';
import { cleanupIncomingHeaders } from '../utils';
import {
  IProxyService,
  IncomingRequestDetails,
  ProxyServiceDeps,
  ProxyHandlerResponse,
  ServerState,
  Headers,
} from './types';

const { PROXY_ID, incomingHeadersRemoval, pm4mlEnabled } = config.get(); // or pass it as a parameter in ctor?

export class ProxyService implements IProxyService {
  constructor(private readonly deps: ProxyServiceDeps) {}

  async sendProxyRequest(reqDetails: IncomingRequestDetails, state: ServerState): Promise<ProxyHandlerResponse> {
    const healthDetails = dto.serverStateToHealthcheckDetailsDto(state);
    if (!healthDetails.isReady) {
      const errResponse = dto.errorResponsePeerFailedToStartDto();
      this.deps.logger.warn('PeerServer state is not ready', { healthDetails, errResponse });
      return errResponse;
    }

    const proxyTarget = this.getProxyTarget(reqDetails, state);
    const { httpsAgent } = state;

    return this.deps.httpClient.sendRequest({
      httpsAgent,
      url: proxyTarget.url,
      headers: proxyTarget.headers,
      method: reqDetails.method,
      data: reqDetails.payload,
    });
  }

  getProxyTarget(reqDetails: IncomingRequestDetails, state: ServerState) {
    const { url, headers } = reqDetails;
    const { accessToken, peerEndpoint } = state;

    const proxyTarget = {
      url: `${pm4mlEnabled ? SCHEME_HTTPS : SCHEME_HTTP}://${peerEndpoint}${url.pathname}${url.search}`,
      headers: {
        ...this.cleanupIncomingHeaders(headers),
        [PROXY_HEADER]: PROXY_ID,
        [AUTH_HEADER]: `Bearer ${accessToken}`,
      },
    };
    this.deps.logger.verbose('proxyTarget: ', proxyTarget);
    return proxyTarget;
  }

  private cleanupIncomingHeaders(headers: Headers) {
    return cleanupIncomingHeaders(headers, incomingHeadersRemoval);
  }
}
