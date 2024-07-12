import { Server } from 'mock-socket';
import { ControlAgent, ICAPeerJWSCert } from '../../../../src/infra/controlAgent';
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

    callbacks = {
      onCert: jest.fn(),
      onPeerJWS: jest.fn(),
    };
    
    controlAgent = new ControlAgent({
      id: 'testControlAgent',
      address: wsAddress,
      port: wsPort,
      logger,
      timeout: 1000,
    });
    
    serverReceivedMessages = [];

    mockWsServer = new Server(`ws://${wsAddress}:${wsPort}`);
    mockWsServer.on('connection', (socket) => {
      socket.on('message', (data) => {
        serverReceivedMessages.unshift(data as any);
      });
    });
  });

  afterEach(() => {
    mockWsServer?.stop();
  });

  test('should create ControlAgent instance', () => {
    expect(controlAgent).toBeTruthy();
    expect(controlAgent.id).toBe('testControlAgent');
  });

  test('should initialize ControlAgent', async () => {
    await controlAgent.init(callbacks);
    expect(controlAgent['_callbackFns']).toBe(callbacks);
  })

  test('should open WebSocket connection', async () => {
    await controlAgent.open();
    expect(logger.info).toHaveBeenCalledWith('testControlAgent websocket connected', {
        url: `${wsAddress}:${wsPort}`,
        protocol: 'ws://',
    });
  });

  test('should reject opening WebSocket connection if it is already open', async () => {
    await controlAgent.open();
    await expect(controlAgent.open()).rejects.toThrow('WebSocket is already open');
  });

  test('should close WebSocket connection', async () => {
    await controlAgent.open();
    const closeSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'close');
    await controlAgent.close();
    expect(closeSpy).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('testControlAgent shutting down...');
  });

  test('should send message', async () => {
    await controlAgent.open();
    const sendSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'send');
    controlAgent.send('test message');
    await wait();
    expect(sendSpy).toHaveBeenCalledWith('test message');
    expect(serverReceivedMessages).toHaveLength(1);
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent sending message', { data: 'test message' });
  });

  test('should send peer JWS message', async () => {
    await controlAgent.open();
    const sendSpy = jest.spyOn(controlAgent, 'send');
    const peerJwsCerts: ICAPeerJWSCert[] = [{ createdAt: 1234567, dfspId: 'testdfsp', publicKey: 'test peer JWS' }];
    controlAgent.sendPeerJWS(peerJwsCerts);
    await wait();
    const actual = sendSpy.mock.calls[0]?.[0];
    expect(serverReceivedMessages).toHaveLength(1);
    expect(actual).toContain(stringify(peerJwsCerts));
  });
});