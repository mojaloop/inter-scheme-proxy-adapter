/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

import { Errors, requests, GenericRequestResponse } from '@mojaloop/sdk-standard-components';
import { cleanupIncomingHeaders } from '../utils';
import { HEADERS_FSPIOP } from '../constants';
import { MtlsCreds } from '../infra';
import { IPingService, PostPingRequestDetails, PostPingResponseDetails, ILogger, Headers } from './types';

export type InboundPingServiceDeps = {
  proxyId: string;
  logger: ILogger;
  createMlPingRequests: (creds: MtlsCreds) => MlPingRequests;
};

export type MlPingRequests = {
  putPing: (params: PutPingParams) => Promise<MlPingResponse>;
  putPingError: (params: PutPingErrorParams) => Promise<MlPingResponse>; // we don't use is so far
};

type PutPingParams = requests.PutPingParams;
type PutPingErrorParams = PutPingParams & {
  errInfo: Errors.MojaloopApiErrorObject;
};
type MlPingResponse = GenericRequestResponse | undefined;

export class InboundPingService implements IPingService {
  private mTlsCreds: MtlsCreds | undefined;
  private log: ILogger;

  constructor(private readonly deps: InboundPingServiceDeps) {
    this.log = deps.logger.child({ component: 'InboundPingService' });
  }

  handlePostPing({ headers, payload }: PostPingRequestDetails): PostPingResponseDetails {
    this.log.verbose('Inbound Ping Service received a ping request', { headers, payload });
    const { requestId } = payload;
    const success = true; // we don't perform JWS validation for proxy-adapter

    this.sendPutPingRequest(requestId, headers).catch((err) => {
      this.log.error('error in sendPutPingRequest: ', err);
    });

    return { success };
  }

  handleFailedValidation(err: Error | undefined) {
    this.log.warn('ping request validation error: ', err);
    return {
      errorInformation: {
        errorCode: '3100',
        errorDescription: err?.message || 'Validation error',
      },
    };
  }

  updateTlsCreds(creds: MtlsCreds) {
    this.mTlsCreds = creds;
    this.log.verbose('updateTlsCreds is done');
  }

  private async sendPutPingRequest(requestId: string, headers: Headers): Promise<MlPingResponse> {
    const sourceFspId = headers[HEADERS_FSPIOP.SOURCE];
    if (!sourceFspId) throw new Error(`No ${HEADERS_FSPIOP.SOURCE} header`);

    if (!this.mTlsCreds) throw new Error('No mTlsCreds are defined');
    // todo: think if mTlsEnabled === false

    const mlPingRequests = this.deps.createMlPingRequests(this.mTlsCreds);
    const result = await mlPingRequests.putPing({
      requestId,
      destination: sourceFspId,
      headers: this.createCallbackHeaders(headers),
    });
    this.log.verbose('sendPutPingRequest is done successfully', { requestId, sourceFspId });
    return result;
  }

  private createCallbackHeaders(headers: Headers): Headers {
    const cleanedHeaders = cleanupIncomingHeaders(headers);
    return {
      ...cleanedHeaders,
      [HEADERS_FSPIOP.DESTINATION]: headers[HEADERS_FSPIOP.SOURCE]!,
      [HEADERS_FSPIOP.SOURCE]: this.deps.proxyId,
    };
  }
}
