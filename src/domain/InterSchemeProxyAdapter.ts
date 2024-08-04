import { INTERNAL_EVENTS } from '../constants';
import { IProxyAdapter, ISPADeps, IncomingRequestDetails, ServerState, PeerJWSEvent } from './types';

export class InterSchemeProxyAdapter implements IProxyAdapter {
  constructor(private readonly deps: ISPADeps) {
    this.addPeerEventListeners();
    this.handleProxyRequest = this.handleProxyRequest.bind(this);
  }

  async handleProxyRequest(reqDetails: IncomingRequestDetails, serverState: ServerState) {
    const { ispaService, httpRequest } = this.deps;
    const { httpsAgent } = serverState;
    const proxyTarget = ispaService.getProxyTarget(reqDetails, serverState); // pass only accessToken

    return httpRequest({
      httpsAgent,
      url: proxyTarget.url,
      headers: proxyTarget.headers,
      method: reqDetails.method,
      data: reqDetails.payload,
    });
  }

  async start(): Promise<void> {
    const [isAStarted, isBStarted] = await Promise.all([
      this.deps.peerA.start(this.handleProxyRequest),
      this.deps.peerB.start(this.handleProxyRequest),
    ]);
    this.deps.logger.info('ISPA is started', { isAStarted, isBStarted });
  }

  async stop(): Promise<void> {
    // prettier-ignore
    const [isAStopped, isBStopped] = await Promise.all([
      this.deps.peerA.stop(),
      this.deps.peerB.stop()
    ]);
    this.deps.logger.info('ISPA is stopped', { isAStopped, isBStopped });
  }

  getDeps() {
    return this.deps;
  }

  private addPeerEventListeners() {
    const { peerA, peerB, logger } = this.deps;

    peerA.on(INTERNAL_EVENTS.peerJWS, (event: PeerJWSEvent) => {
      peerB.propagatePeerJWSEvent(event);
      logger.info('peerJWS event is propagated [A --> B]');
    });

    peerB.on(INTERNAL_EVENTS.peerJWS, (event: PeerJWSEvent) => {
      peerA.propagatePeerJWSEvent(event);
      logger.info('peerJWS event is propagated [B --> A]');
    });
  }
}
