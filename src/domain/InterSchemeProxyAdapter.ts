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

import { IProxyAdapter, ISPADeps, IncomingRequestDetails } from './types';

export class InterSchemeProxyAdapter implements IProxyAdapter {
  constructor(private readonly deps: ISPADeps) {
    this.handleProxyRequest = this.handleProxyRequest.bind(this);
  }

  async handleProxyRequest(input: IncomingRequestDetails) {
    const { ispaService, httpRequest, logger } = this.deps;
    const proxyTarget = ispaService.getProxyTarget(input);

    // todo: think, if it's ok to use the same agent to call both hubs
    const response = await httpRequest({
      url: proxyTarget.url,
      headers: proxyTarget.headers,
      method: input.method,
      data: input.payload,
    });
    logger.info('proxy response is ready', response);

    return response;
  }

  async start(): Promise<void> {
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
}
