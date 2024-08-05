import { INTERNAL_EVENTS } from '../constants';
import { IProxyAdapter, ISPADeps, PeerJWSEvent } from './types';

export class InterSchemeProxyAdapter implements IProxyAdapter {
  constructor(private readonly deps: ISPADeps) {
    this.addPeerEventListeners();
  }

  async start(): Promise<void> {
    const [isAStarted, isBStarted] = await Promise.all([this.deps.peerA.start(), this.deps.peerB.start()]);
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
