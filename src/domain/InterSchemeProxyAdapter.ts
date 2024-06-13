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

import { GenericObject, ICACerts } from '#src/infra/control-agent/types';
import { INTERNAL_EVENTS } from '../constants';
import { IProxyAdapter, ISPADeps, IncomingRequestDetails, ServerState } from './types';

export const MOCK_TOKEN = 'noAccessTokenYet';

export class InterSchemeProxyAdapter implements IProxyAdapter {
  constructor(private readonly deps: ISPADeps) {
    this.handleProxyRequest = this.handleProxyRequest.bind(this);
  }

  async handleProxyRequest(reqDetails: IncomingRequestDetails, state: ServerState) {
    const { ispaService, httpRequest, logger } = this.deps;
    const proxyTarget = ispaService.getProxyTarget(reqDetails, state);

    // todo: think, if it's ok to use the same agent to call both hubs
    const response = await httpRequest({
      url: proxyTarget.url,
      headers: proxyTarget.headers,
      method: reqDetails.method,
      data: reqDetails.payload,
    });
    logger.info('proxy response is ready', response);

    return response;
  }

  async start(): Promise<void> {
    // todo: get certs
    await this.getAccessTokens();
    await this.initControlAgents();

    const [isAStarted, isBStarted] = await Promise.all([
      this.deps.httpServerA.start(this.handleProxyRequest),
      this.deps.httpServerB.start(this.handleProxyRequest),
    ]);
    this.deps.logger.info('ISPA is started', { isAStarted, isBStarted });
  }

  async stop(): Promise<void> {
    // prettier-ignore
    const [isAStopped, isBStopped] = await Promise.all([
      this.deps.httpServerA.stop(),
      this.deps.httpServerB.stop(),
    ]);
    this.deps.logger.info('ISPA is stopped', { isAStopped, isBStopped });
  }

  private async sendProxyRequest() {
    // send proxy request
  }

  private async getAccessTokens() {
    // todo: add logic to obtain access tokens [CSI-126]
    const tokenA = MOCK_TOKEN;
    const tokenB = MOCK_TOKEN;

    this.deps.httpServerA.emit(INTERNAL_EVENTS.state, { accessToken: tokenA });
    this.deps.httpServerB.emit(INTERNAL_EVENTS.state, { accessToken: tokenB });

    return { tokenA, tokenB }; // think, if we need this
  }

  private async initControlAgents() {
    const { httpServerA, httpServerB  } = this.deps;
    
    this.deps.controlAgentA.init({
      onCert: (certs: ICACerts) => { httpServerA.emit(INTERNAL_EVENTS.state, { certs } as GenericObject); }
    });

    this.deps.controlAgentB.init({
      onCert: (certs: ICACerts) => { httpServerB.emit(INTERNAL_EVENTS.state, { certs } as GenericObject); }
    });
  }
}
