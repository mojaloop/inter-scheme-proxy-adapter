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

  Steven Oderayi <steven.oderayi@infitx.com>
 **********/

jest.unmock('ws');

import { randomUUID } from 'crypto';
import { ICACerts, ICAPeerJWSCert, deserialise, serialise } from '../../../src/infra';
import { createControlAgents } from '../../../src/infra';
import { loggerFactory } from '../../../src/utils';

const wait = (ms: number = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('InterSchemeProxyAdapter', () => {
  const logger = loggerFactory(`InterSchemeProxyAdapterTest`);
  const { controlAgentA, controlAgentB } = createControlAgents({ logger });

  afterAll(async () => {
    return Promise.all([controlAgentA.close(), controlAgentB.close()]);
  });

  test('should publish peer JWS keys', async () => {
    // Arrange
    await controlAgentA.init({
      onCert: (_certs: ICACerts) => jest.fn(),
      onPeerJWS: (_peerJWS: ICAPeerJWSCert[]) => jest.fn(),
    });

    await controlAgentB.init({
      onCert: (_certs: ICACerts) => jest.fn(),
      onPeerJWS: (_peerJWS: ICAPeerJWSCert[]) => jest.fn(),
    });

    // Act
    // Send a test message to mock server to publish peer JWS keys
    const peerJWSMessage = {
      id: randomUUID(),
      msg: 'PEER_JWS',
      verb: 'NOTIFY',
      data: [
        {
          createdAt: Date.now(),
          dfspId: 'testdfsp',
          publicKey: 'test peer JWS key',
        },
      ],
    };
    const testMessage = {
      id: randomUUID(),
      msg: 'TEST',
      verb: 'PUBLISH',
      data: peerJWSMessage,
    };
    controlAgentA.send(serialise(testMessage));
    await wait(200);

    // Assert
    // Read messges received by Mgt API B
    const readMessage = {
      id: randomUUID(),
      msg: 'TEST',
      verb: 'GET_MESSAGES',
    };
    controlAgentB.send(serialise(readMessage));
    const receivedMessages: any = await controlAgentB.receive(false);
    const parsedMessages = receivedMessages.map((msg: any) => deserialise(msg));
    expect(parsedMessages[1].msg).toBe('PEER_JWS');
    expect(parsedMessages[1].data[0]).toStrictEqual(peerJWSMessage.data[0]);
  });
});
