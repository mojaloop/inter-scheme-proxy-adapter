import { EventEmitter } from 'node:events';
import { INTERNAL_EVENTS } from '../constants';
import { DnsError } from '../errors';
import { ICACerts, ICAPeerJWSCert } from '../infra';
import config from '../config'; // try to avoid this dependency (pass through ctor?)
import {
  TPeerServer,
  TPeerServerDeps,
  ServerStateEvent,
  PeerJWSEvent,
  IncomingRequestDetails,
  ServerState,
} from './types';

const { checkPeerJwsInterval, pm4mlEnabled } = config.get();
const NEED_RETRY_ON_FAILURE = true; // make configurable?

type Timer = NodeJS.Timeout | undefined;

export class PeerServer extends EventEmitter implements TPeerServer {
  private isReady = false;
  private retryStartTimer: Timer;
  private peerJwsRefreshLoopTimer: Timer;

  constructor(private readonly deps: TPeerServerDeps) {
    super();
    this.handleProxyRequest = this.handleProxyRequest.bind(this);
  }

  async handleProxyRequest(reqDetails: IncomingRequestDetails, serverState: ServerState) {
    return this.deps.proxyService.sendProxyRequest(reqDetails, serverState);
  }

  async start() {
    const isPm4mlOk = await this.startPm4mlPart();
    const isServerOk = await this.deps.httpServer.start(this.handleProxyRequest);
    this.deps.logger.info('PeerServer is started', { isServerOk, isPm4mlOk, pm4mlEnabled });
    return isPm4mlOk && isServerOk;
  }

  async stop() {
    if (this.retryStartTimer) clearTimeout(this.retryStartTimer);
    this.removeAllListeners(INTERNAL_EVENTS.peerJWS);
    await this.stopPm4mlPart();
    await this.deps.httpServer.stop();
    this.isReady = false;

    this.deps.logger.info('PeerServer is stopped');
    return true;
  }

  propagatePeerJWSEvent(event: PeerJWSEvent) {
    if (!this.isReady) {
      this.deps.logger.warn('peerJWSEvent is NOT sent, coz peerServer is not ready');
      return false;
    }
    this.deps.controlAgent.sendPeerJWS(event?.peerJWS);
    this.deps.logger.debug('peerJWSEvent is sent');
    return true;
  }

  private async startPm4mlPart() {
    if (pm4mlEnabled) {
      try {
        await this.getAccessToken();
        await this.initControlAgent();
        this.startPeerJwsRefreshLoop();
        this.deps.logger.info('accessToken and certs are ready');
      } catch (err) {
        this.deps.logger.error('error in startPm4mlPart:', err);
        if (!NEED_RETRY_ON_FAILURE) throw err;
        await this.retryStartPm4ml(DnsError.isDnsRelatedError(err));
        return false;
      }
    }
    return (this.isReady = true);
  }

  private async stopPm4mlPart() {
    if (pm4mlEnabled) {
      try {
        this.deps.authClient.stopUpdates();
        this.stopPeerJwsRefreshLoop();
        await this.deps.controlAgent.close();
        this.deps.logger.debug('stopPm4mlPart is finished');
      } catch (err) {
        this.deps.logger.warn('stopPm4mlPart is failed', err);
        // todo: think, what we should do in case error here?
      }
    }
    return (this.isReady = false);
  }

  private async retryStartPm4ml(isDnsError = false) {
    // think, if it's better to retry only failed steps
    await this.stopPm4mlPart();
    // prettier-ignore
    const delayMs = 1000 * (isDnsError
      ? config.get('retryDnsErrorTimeoutSec')
      : config.get('retryStartTimeoutSec')
    );
    this.retryStartTimer = setTimeout(() => this.startPm4mlPart(), delayMs);
    this.deps.logger.info('retryStartPm4ml is scheduled', { isDnsError, delayMs });
  }

  private async getAccessToken() {
    const emitNewToken = (accessToken: string) => this.emitServerStateEvent({ accessToken });
    const result = await this.deps.authClient.startAccessTokenUpdates(emitNewToken);
    if (!result.success) {
      throw result.error || new Error('Unknown Error in getAccessToken');
    }

    this.deps.logger.debug('getAccessToken is done', result);
    return result.success;
  }

  private async initControlAgent() {
    const { controlAgent, logger } = this.deps;

    await controlAgent.init({
      onCert: (certs: ICACerts) => this.emitServerStateEvent({ certs }),
      onPeerJWS: (peerJWS: ICAPeerJWSCert[]) => this.emitPeerJWSEvent({ peerJWS }),
    });
    await controlAgent.loadCerts();
    logger.verbose('initControlAgent is done');
    return true;
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
