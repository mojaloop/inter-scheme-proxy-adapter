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

import { requests, BaseRequestTLSConfig } from '@mojaloop/sdk-standard-components';
import { ILogger, MlPingRequests } from '../domain';

type CreateMlPingRequestsOptions = {
  logger: ILogger;
  proxyId: string;
  pingCallbackEndpoint: string;
  mTlsEnabled: boolean;
};

export type MtlsCreds = BaseRequestTLSConfig['creds'];

// prettier-ignore
export const createMlPingRequestsFactory = (opts: CreateMlPingRequestsOptions) =>
  (creds: MtlsCreds): MlPingRequests => {
    const tls = {
      mutualTLS: { enabled: opts.mTlsEnabled },
      // todo: clarify a proper format; see BaseRequestTLSConfig and sdk-standard-components/src/lib/requests/baseRequests.js (line 63)
      enabled: opts.mTlsEnabled,
      creds,
    };
    opts.logger.debug('creating MlPingRequests...', {
      dfspId: opts.proxyId,
      peerEndpoint: opts.pingCallbackEndpoint,
    });

    return new requests.PingRequests({
      tls,
      logger: opts.logger,
      dfspId: opts.proxyId,
      peerEndpoint: opts.pingCallbackEndpoint, // think if we need a separate option for peerEndpoint
      pingEndpoint: opts.pingCallbackEndpoint,
      jwsSign: false, // we don't validate JWS for ISPA
      // think if we need the rest opts:
      // jwsSigningKey: opts.jwsSigningKey;
      // wso2: config.wso2;
      // resourceVersions: opts.resourceVersions;
      // apiType: opts.apiType;
    });
  };
