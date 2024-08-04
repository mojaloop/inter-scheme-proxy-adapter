import config from '../config';
import { PROXY_HEADER, AUTH_HEADER, SCHEME_HTTP, SCHEME_HTTPS } from '../constants';
import { ISPAServiceInterface, ISPAServiceDeps, IncomingRequestDetails, ServerState, ILogger } from './types';

const { PROXY_ID, incomingHeadersRemoval, pm4mlEnabled } = config.get(); // or pass it as a parameter in ctor?

export class ISPAService implements ISPAServiceInterface {
  private readonly log: ILogger;

  constructor(deps: ISPAServiceDeps) {
    this.log = deps.logger.child(ISPAService.name);
  }

  getProxyTarget(reqDetails: IncomingRequestDetails, state: ServerState) {
    const { url, peerEndpoint } = reqDetails; // move peerEndpoint to ServerState?

    const proxyTarget = {
      url: `${pm4mlEnabled ? SCHEME_HTTPS : SCHEME_HTTP}://${peerEndpoint}${url.pathname}${url.search}`,
      headers: {
        ...this.cleanupIncomingHeaders(reqDetails.headers),
        [PROXY_HEADER]: PROXY_ID,
        [AUTH_HEADER]: `Bearer ${state.accessToken}`,
      },
    };
    this.log.verbose('proxyTarget: ', proxyTarget);
    return proxyTarget;
  }

  private cleanupIncomingHeaders(headers: Record<string, string>) {
    const cleanedHeaders = { ...headers };
    // prettier-ignore
    [
      ...sensitiveHeaders,
      ...hopByHopHeaders,
      ...xHeaders,
      ...incomingHeadersRemoval
    ].forEach((header) => {
      delete cleanedHeaders[header];
    });

    return cleanedHeaders;
  }
}

export const sensitiveHeaders = [
  'authorization',
  'cookie',
  'set-cookie',
  'host', // without removing host header request proxy fails with error: "Client network socket disconnected before secure TLS connection was established"
  'content-length', // without removing content-length header request just stuck
  'accept-encoding',
  'user-agent',
] as const;

export const hopByHopHeaders = [
  'connection',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'keep-alive',
] as const;

export const xHeaders = [
  'x-forwarded-proto',
  'x-request-id',
  'x-envoy-attempt-count',
  'x-forwarded-for',
  'x-forwarded-client-cert',
  'x-envoy-external-address',
  'x-envoy-decorator-operation',
  'x-envoy-peer-metadata',
  'x-envoy-peer-metadata-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
] as const;
