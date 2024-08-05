jest.unmock('ws');

import { randomUUID } from 'node:crypto';
import config from '#src/config';
import { createControlAgent, ICACerts, ICAPeerJWSCert, deserialise, serialise } from '#src/infra';
import { loggerFactory } from '#src/utils';

const wait = (ms: number = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ControlAgent Integration Tests -->', () => {
  const logger = loggerFactory('CAIT');
  const controlAgentA = createControlAgent({
    peer: 'A',
    controlAgentConfig: config.get('peerAConfig.controlAgentConfig'),
    logger,
  });
  const controlAgentB = createControlAgent({
    peer: 'B',
    controlAgentConfig: config.get('peerBConfig.controlAgentConfig'),
    logger,
  });

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
