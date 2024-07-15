/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

import { INTERNAL_EVENTS } from '../constants';
import { IProxyAdapter, ISPADeps, IncomingRequestDetails, ServerState, ServerStateEvent } from './types';
import { ICACerts, ICAPeerJWSCert } from '../infra';
import config from '../config';
const { checkPeerJwsInterval } = config.get();

export class InterSchemeProxyAdapter implements IProxyAdapter {
  private peerJwsRefreshLoopTimer: NodeJS.Timeout | undefined;
  constructor(private readonly deps: ISPADeps) {
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
    await this.getAccessTokens();
    await this.initControlAgents();
    await this.loadInitialCerts();
    this.startPeerJwsRefreshLoop();
    this.deps.logger.debug('certs and token are ready, starting httpServers...');

    const [isAStarted, isBStarted] = await Promise.all([
      this.deps.httpServerA.start(this.handleProxyRequest),
      this.deps.httpServerB.start(this.handleProxyRequest),
    ]);

    this.deps.logger.info('ISPA is started', { isAStarted, isBStarted });
  }

  async stop(): Promise<void> {
    this.deps.authClientA.stopUpdates();
    this.deps.authClientB.stopUpdates();
    this.stopPeerJwsRefreshLoop();
    // prettier-ignore
    const [isAStopped, isBStopped] = await Promise.all([
      this.deps.httpServerA.stop(),
      this.deps.httpServerB.stop(),
    ]);
    this.deps.logger.info('ISPA is stopped', { isAStopped, isBStopped });
  }

  private emitStateEventServerA(event: ServerStateEvent) {
    this.deps.httpServerA.emit(INTERNAL_EVENTS.serverState, event);
  }

  private emitStateEventServerB(event: ServerStateEvent) {
    this.deps.httpServerB.emit(INTERNAL_EVENTS.serverState, event);
  }

  private async getAccessTokens() {
    const emitNewTokenA = (accessToken: string) => this.emitStateEventServerA({ accessToken });
    const emitNewTokenB = (accessToken: string) => this.emitStateEventServerB({ accessToken });

    await Promise.all([
      this.deps.authClientA.startAccessTokenUpdates(emitNewTokenA),
      this.deps.authClientB.startAccessTokenUpdates(emitNewTokenB),
    ]);
  }

  private async initControlAgents() {
    const { controlAgentA, controlAgentB } = this.deps;

    await Promise.all([
      controlAgentA.init({
        onCert: (certs: ICACerts) => this.emitStateEventServerA({ certs }),
        onPeerJWS: (peerJWS: ICAPeerJWSCert[]) => this.deps.controlAgentB.sendPeerJWS(peerJWS),
      }),
      controlAgentB.init({
        onCert: (certs: ICACerts) => this.emitStateEventServerB({ certs }),
        onPeerJWS: (peerJWS: ICAPeerJWSCert[]) => this.deps.controlAgentA.sendPeerJWS(peerJWS),
      }),
    ]);
  }

  private async loadInitialCerts() {
    const [certsA, certsB] = await Promise.all([
      this.deps.controlAgentA.loadCerts(),
      this.deps.controlAgentB.loadCerts(),
    ]);

    this.emitStateEventServerA({ certs: certsA });
    this.emitStateEventServerB({ certs: certsB });
  }

  // @note: This is a fail safe measure to ensure that the peer JWS certs 
  // are optimistically retrieved, just in case the websocket event is missed. 
  private startPeerJwsRefreshLoop() {
    this.peerJwsRefreshLoopTimer = setInterval(() => {
      this.deps.controlAgentA.triggerFetchPeerJws();
      this.deps.controlAgentB.triggerFetchPeerJws();
    }, checkPeerJwsInterval);
  }

  private async stopPeerJwsRefreshLoop() {
    clearInterval(this.peerJwsRefreshLoopTimer);
  }
}
