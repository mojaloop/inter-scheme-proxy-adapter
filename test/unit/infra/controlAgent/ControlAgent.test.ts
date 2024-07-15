import { Server } from 'mock-socket';
import { ControlAgent, ICAPeerJWSCert, deserialise } from '../../../../src/infra/controlAgent';
import { ICACallbacks } from '../../../../src/types';
import { ILogger } from '../../../../src/domain/types';
import stringify from 'fast-safe-stringify';

const wait = (ms: number = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ControlAgent Tests', () => {
  let controlAgent: ControlAgent;
  let logger: ILogger;
  let callbacks: ICACallbacks;
  let mockWsServer: Server;
  let serverReceivedMessages: string[];
  const wsAddress = 'localhost';
  const wsPort = 8000;

  beforeEach(async () => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as ILogger;

    serverReceivedMessages = [];

    mockWsServer = new Server(`ws://${wsAddress}:${wsPort}`);
    mockWsServer.on('connection', (socket) => {
      socket.on('message', (data) => {
        serverReceivedMessages.unshift(data as any);
      });
    });

    callbacks = {
      onCert: jest.fn(),
      onPeerJWS: jest.fn(),
    };
    
    controlAgent = new ControlAgent({
      id: 'testControlAgent',
      address: wsAddress,
      port: wsPort,
      logger,
      timeout: 1_000,
      reconnectInterval: 1_000,
    });

    // we need to modify the _handle method since mock-socket's
    // message format is different from the one expected by ControlAgent
    const originalHandle = controlAgent['_handle'];
    controlAgent['_handle'] = function (data: any) {
      const boundHandle = originalHandle.bind(this);
      boundHandle(data.data);
    }

    await controlAgent.init(callbacks);
  });

  afterEach(async () => {
    return mockWsServer?.stop();
  });

  test('should create ControlAgent instance', () => {
    expect(controlAgent).toBeTruthy();
    expect(controlAgent.id).toBe('testControlAgent');
  });

  test('should initialize ControlAgent', async () => {
    expect(controlAgent['_callbackFns']).toBe(callbacks);
  })

  test('should open WebSocket connection', async () => {
    expect(logger.info).toHaveBeenCalledWith('testControlAgent websocket connected', {
        url: `${wsAddress}:${wsPort}`,
        protocol: 'ws://',
    });
    expect(mockWsServer.clients()).toHaveLength(1);
  });

  test('should reject opening WebSocket connection if it is already open', async () => {
    await expect(controlAgent.open()).rejects.toThrow('WebSocket is already open');
  });

  test('should close WebSocket connection', async () => {
    const closeSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'close');
    await controlAgent.close();
    expect(closeSpy).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('testControlAgent shutting down...');
  });

  test('should send message', async () => {
    const sendSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'send');
    controlAgent.send('test message');
    await wait();
    expect(sendSpy).toHaveBeenCalledWith('test message');
    expect(serverReceivedMessages).toHaveLength(1);
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent sending message', { data: 'test message' });
  });

  test('should send peer JWS message', async () => {
    const sendSpy = jest.spyOn(controlAgent, 'send');
    const peerJwsCerts: ICAPeerJWSCert[] = [{ createdAt: 1234567, dfspId: 'testdfsp', publicKey: 'test peer JWS' }];
    controlAgent.sendPeerJWS(peerJwsCerts);
    await wait();
    const actual = sendSpy.mock.calls[0]?.[0];
    expect(serverReceivedMessages).toHaveLength(1);
    expect(actual).toContain(stringify(peerJwsCerts));
  });

  test('should handle incoming peerJWS message', async () => {
    const peerJWSCerts: ICAPeerJWSCert[] = [{ createdAt: 1234567, dfspId: 'testdfsp', publicKey: 'test peer JWS' }];
    const peerJWSMsg = controlAgent.build.PEER_JWS.NOTIFY(peerJWSCerts);
    const expected = { msg: deserialise(peerJWSMsg) };
    mockWsServer.emit('message', peerJWSMsg);
    await wait();
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent received ', expected); 
    expect(callbacks.onPeerJWS).toHaveBeenCalledWith(peerJWSCerts);
  });
});