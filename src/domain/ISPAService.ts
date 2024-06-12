import config from '../config';
import { PROXY_HEADER } from '../constants';
import { ISPAServiceInterface, ISPAServiceDeps, ILogger, ProxyHandlerInput } from './types';

const { PROXY_DFSP_ID } = config.get(); // or pass it as a parameter in ctor?

export class ISPAService implements ISPAServiceInterface {
  private readonly log: ILogger;

  constructor(deps: ISPAServiceDeps) {
    this.log = deps.logger.child(ISPAService.name);
  }

  getProxyTarget(input: ProxyHandlerInput) {
    const { pathname, search } = input.url;
    const { baseUrl } = input.proxyDetails;

    const proxyTarget = {
      url: `${baseUrl}${pathname}${search}`,
      headers: {
        ...input.headers,
        [PROXY_HEADER]: PROXY_DFSP_ID,
      },
    };
    this.log.verbose('proxyTarget: ', proxyTarget);
    return proxyTarget;
  }
}
