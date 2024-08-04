import { EventEmitter } from 'node:events';
import config from '../config'; // try to avoid this dependency
import { INTERNAL_EVENTS } from '../constants';
import { ICACerts, ICAPeerJWSCert } from '../infra';
import { TPeerServer, TPeerServerDeps, ProxyHandlerFn, ServerStateEvent, PeerJWSEvent } from './types';

const { checkPeerJwsInterval, pm4mlEnabled } = config.get();

export class PeerServer extends EventEmitter implements TPeerServer {
  // todo: move state from httpServer here - private state: ServerState
  private peerJwsRefreshLoopTimer: NodeJS.Timeout | undefined;

  constructor(private readonly deps: TPeerServerDeps) {
    super();
  }

  async start(handleProxyRequestFn: ProxyHandlerFn) {
    if (pm4mlEnabled) {
      await this.getAccessToken();
      await this.initControlAgent();
      await this.loadInitialCerts();
      this.startPeerJwsRefreshLoop();
      this.deps.logger.debug('certs and token are ready.');
    }
    const isStarted = await this.deps.httpServer.start(handleProxyRequestFn);
    this.deps.logger.info('PeerServer is started', { isStarted, pm4mlEnabled });
    return isStarted;
  }

  async stop() {
    this.deps.authClient.stopUpdates();
    this.stopPeerJwsRefreshLoop();
    await this.deps.controlAgent.close();
    await this.deps.httpServer.stop();

    this.deps.logger.info('PeerServer is stopped');
    return true;
  }

  propagatePeerJWSEvent(event: PeerJWSEvent) {
    this.deps.controlAgent.sendPeerJWS(event?.peerJWS);
    this.deps.logger.verbose('peerJWSEvent is sent');
  }

  private async getAccessToken() {
    const emitNewToken = (accessToken: string) => this.emitServerStateEvent({ accessToken });
    await this.deps.authClient.startAccessTokenUpdates(emitNewToken);
    this.deps.logger.debug('getAccessToken is done');
  }

  private async initControlAgent() {
    await this.deps.controlAgent.init({
      onCert: (certs: ICACerts) => this.emitServerStateEvent({ certs }),
      onPeerJWS: (peerJWS: ICAPeerJWSCert[]) => this.emitPeerJWSEvent({ peerJWS }),
    });
    this.deps.logger.debug('initControlAgent is done');
  }

  private async loadInitialCerts() {
    const certs = await this.deps.controlAgent.loadCerts();
    this.emitServerStateEvent({ certs });
    this.deps.logger.debug('loadInitialCerts is done');
  }

  // @note: This is a fail safe measure to ensure that the peer JWS certs
  // are optimistically retrieved, just in case the websocket event is missed.
  private startPeerJwsRefreshLoop() {
    this.peerJwsRefreshLoopTimer = setInterval(() => {
      this.deps.controlAgent.triggerFetchPeerJws();
      this.deps.logger.debug('controlAgent.triggerFetchPeerJws is done', { checkPeerJwsInterval });
    }, checkPeerJwsInterval);
  }

  private stopPeerJwsRefreshLoop() {
    clearInterval(this.peerJwsRefreshLoopTimer);
  }

  private emitServerStateEvent(stateEvent: ServerStateEvent) {
    this.deps.httpServer.emit(INTERNAL_EVENTS.serverState, stateEvent);
  }

  private emitPeerJWSEvent(event: PeerJWSEvent) {
    this.emit(INTERNAL_EVENTS.peerJWS, event);
  }
}
