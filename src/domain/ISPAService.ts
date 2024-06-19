import config from '../config';
import { PROXY_HEADER, AUTH_HEADER } from '../constants';
import { ISPAServiceInterface, ISPAServiceDeps, IncomingRequestDetails, ServerState, ILogger } from './types';

const { PROXY_ID } = config.get(); // or pass it as a parameter in ctor?

export class ISPAService implements ISPAServiceInterface {
  private readonly log: ILogger;

  constructor(deps: ISPAServiceDeps) {
    this.log = deps.logger.child(ISPAService.name);
  }

  getProxyTarget(reqDetails: IncomingRequestDetails, state: ServerState) {
    const { pathname, search } = reqDetails.url;
    const { baseUrl } = reqDetails.proxyDetails;

    // todo: remove sensitive and hopByHop headers
    delete reqDetails.headers['content-length'];
    // todo: clarify, why without removing content-length header request just stuck
    delete reqDetails.headers['host'];

    const proxyTarget = {
      url: `${baseUrl}${pathname}${search}`,
      headers: {
        ...reqDetails.headers,
        [PROXY_HEADER]: PROXY_ID,
        [AUTH_HEADER]: `Bearer ${state.accessToken}`,
      },
    };
    this.log.verbose('proxyTarget: ', proxyTarget);
    return proxyTarget;
  }
}
