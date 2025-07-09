import { INTERNAL_EVENTS } from '../constants';
import { IProxyAdapter, ISPADeps, PeerJWSEvent, PingAuthDetails } from './types';

export class InterSchemeProxyAdapter implements IProxyAdapter {
  constructor(private readonly deps: ISPADeps) {
    this.addPeerEventListeners();
  }

  async start(): Promise<void> {
    // prettier-ignore
    const [isAok, isBok] = await Promise.all([
      this.deps.peerA.start(),
      this.deps.peerB.start(),
    ]);
    this.deps.logger.info('ISPA is started', { isAok, isBok });
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
      const isSent = peerB.propagatePeerJWSEvent(event);
      logger.info('peerJWS event is processed [A --> B]', { isSent });
    });

    peerB.on(INTERNAL_EVENTS.peerJWS, (event: PeerJWSEvent) => {
      const isSent = peerA.propagatePeerJWSEvent(event);
      logger.info('peerJWS event is processed [B --> A]', { isSent });
    });

    peerA.on(INTERNAL_EVENTS.pingAuthDetails, (event: PingAuthDetails) => {
      peerB.updatePingAuthDetails(event);
      logger.info('pingAuthDetails event is processed [A --> B]');
    });

    peerB.on(INTERNAL_EVENTS.pingAuthDetails, (event: PingAuthDetails) => {
      peerA.updatePingAuthDetails(event);
      logger.info('pingAuthDetails event is processed [B --> A]');
    });
  }
}
