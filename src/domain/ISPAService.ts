import config from '../config';
import { PROXY_HEADER, AUTH_HEADER, SCHEME } from '../constants';
import { ISPAServiceInterface, ISPAServiceDeps, IncomingRequestDetails, ServerState, ILogger } from './types';

const { PROXY_ID, incomingHeadersRemoval } = config.get(); // or pass it as a parameter in ctor?

export class ISPAService implements ISPAServiceInterface {
  private readonly log: ILogger;

  constructor(deps: ISPAServiceDeps) {
    this.log = deps.logger.child(ISPAService.name);
  }

  getProxyTarget(reqDetails: IncomingRequestDetails, state: ServerState) {
    const { pathname, search } = reqDetails.url;
    const { baseUrl } = reqDetails.proxyDetails;

    const proxyTarget = {
      url: `${SCHEME}://${baseUrl}${pathname}${search}`,
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

    // todo: remove sensitive and hopByHop headers
    [
      ...incomingHeadersRemoval,
      'host',
      'content-length', // todo: clarify, why without removing content-length header request just stuck
      'user-agent',
      'accept-encoding',
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
    ].forEach((header) => {
      delete cleanedHeaders[header];
    });

    return cleanedHeaders;
  }
}
