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

import { setTimeout as sleep } from 'node:timers/promises';
import { InboundPingService, MlPingRequests } from '#src/domain';
import { createMlPingRequestsFactory, MtlsCreds } from '#src/infra';
import { logger } from '#src/utils';
import config from '#src/config';
import * as fixtures from '#test/fixtures';

// const mockAxios = new MockAdapter(axios);

type CreatePingServiceOptions = {
  createMlPingRequests?: (creds: MtlsCreds) => MlPingRequests;
  appConfig?: typeof config;
};

// prettier-ignore
const createInboundPingService = ({
  createMlPingRequests,
  appConfig = config
}: CreatePingServiceOptions = {}) => {
  const proxyId = appConfig.get('PROXY_ID');
  const { pingCallbackEndpoint } = appConfig.get('peerAConfig');

  return new InboundPingService({
    proxyId,
    logger,
    createMlPingRequests: createMlPingRequests || createMlPingRequestsFactory({
      logger,
      proxyId,
      pingCallbackEndpoint,
      mTlsEnabled: true,
    }),
  });
};

describe('InboundPingService Tests -->', () => {
  const mockPingRequests: MlPingRequests = {
    putPing: jest.fn(),
    putPingError: jest.fn(),
  };

  afterEach(() => {
    jest.restoreAllMocks(); // restore the spy created with spyOn
  });

  test('should send putPing request if mTlsCreds is properly defined', async () => {
    const pingService = createInboundPingService({
      createMlPingRequests: () => mockPingRequests,
    });
    pingService.updateTlsCreds({
      cert: 'cert',
      key: 'key',
      ca: 'ca',
    });

    const result = pingService.handlePostPing({
      headers: fixtures.mockHeaders(),
      payload: { requestId: '123' },
    });
    expect(result.success).toBe(true);
    await sleep(1000);
    expect(mockPingRequests.putPing).toHaveBeenCalled();
  });

  test('should NOT send putPing request if mTlsCreds is not defined', async () => {
    const pingService = createInboundPingService({
      createMlPingRequests: () => mockPingRequests,
    });

    pingService.handlePostPing({
      headers: fixtures.mockHeaders(),
      payload: { requestId: '123' },
    });
    await sleep(1000);
    expect(mockPingRequests.putPing).not.toHaveBeenCalled();
  });

  test('should NOT send putPing request if mTlsCreds does NOT have cert field', async () => {
    const pingService = createInboundPingService({
      createMlPingRequests: () => mockPingRequests,
    });
    pingService.updateTlsCreds({ ca: 'ca' } as MtlsCreds);

    pingService.handlePostPing({
      headers: fixtures.mockHeaders(),
      payload: { requestId: '123' },
    });
    await sleep(1000);
    expect(mockPingRequests.putPing).not.toHaveBeenCalled();
  });
});
