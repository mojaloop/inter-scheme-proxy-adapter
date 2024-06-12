import config from '../config';
import { PROXY_HEADER, AUTH_HEADER } from '../constants';
import { ISPAServiceInterface, ISPAServiceDeps, ILogger, IncomingRequestDetails } from './types';

const { PROXY_DFSP_ID } = config.get(); // or pass it as a parameter in ctor?

export class ISPAService implements ISPAServiceInterface {
  private readonly log: ILogger;

  constructor(deps: ISPAServiceDeps) {
    this.log = deps.logger.child(ISPAService.name);
  }

  getProxyTarget(input: IncomingRequestDetails) {
    const { pathname, search } = input.url;
    const { baseUrl } = input.proxyDetails;

    delete input.headers['content-length'];
    // todo: clarify, why without removing content-length header request just stuck
    const token = this.getBearerToken();

    const proxyTarget = {
      url: `${baseUrl}${pathname}${search}`,
      headers: {
        ...input.headers,
        [PROXY_HEADER]: PROXY_DFSP_ID,
        [AUTH_HEADER]: `Bearer ${token}`,
      },
    };
    this.log.verbose('proxyTarget: ', proxyTarget);
    return proxyTarget;
  }

  private getBearerToken() {
    // todo: implement token retrieval
    return 'TOKEN_NOT_IMPLEMENTED_YET';
  }
}
