import stringify from 'fast-safe-stringify';
import { Client, Server } from 'mock-socket';
import { ControlAgent, ICAPeerJWSCert, deserialise } from '#src/infra/controlAgent';
import { ICACallbacks, ILogger } from '#src/types';
import { logger as globalLogger } from '#src/utils';
import { mtlsCertsDto, peerJWSCertsDto } from '#test/fixtures';

// think if we need it, and if so - import from @mojaloop/central-services-logger
export const logLevelValues = ['error', 'warn', 'info', 'verbose', 'debug', 'silly', 'audit', 'trace', 'perf'] as const;

const wait = (ms: number = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ControlAgent Tests', () => {
  let controlAgent: ControlAgent;
  let logger: ILogger;
  let callbacks: ICACallbacks;
  let mockWsServer: Server;
  let mockSocket: Client;
  let serverReceivedMessages: string[];
  const wsAddress = 'localhost';
  const wsPort = 8000;

  const testControlAgentParamsDto = () =>
    Object.freeze({
      id: 'testControlAgent',
      address: wsAddress,
      port: wsPort,
      logger,
      connectionTimeout: 1_000,
      timeout: 5_000,
      reconnectInterval: 1_000,
    });

  beforeEach(async () => {
    logger = globalLogger.child({ test: 'ControlAgentTests' });
    logLevelValues.forEach((method) => {
      jest.spyOn(logger.constructor.prototype, method);
    }); // to be able to check logger.child() instance calls

    serverReceivedMessages = [];

    mockWsServer = new Server(`ws://${wsAddress}:${wsPort}`);
    mockWsServer.on('connection', (socket) => {
      mockSocket = socket;
      socket.on('message', (data) => {
        serverReceivedMessages.unshift(data as any);
      });
    });

    callbacks = {
      onCert: jest.fn(),
      onPeerJWS: jest.fn(),
    };

    controlAgent = new ControlAgent(testControlAgentParamsDto());

    // we need to modify the _handle method since mock-socket's
    // message format is different from the one expected by ControlAgent
    const originalHandle = controlAgent['_handle'];
    controlAgent['_handle'] = function (data: any) {
      const boundHandle = originalHandle.bind(this);
      boundHandle(data.data || data);
    };

    await controlAgent.init(callbacks);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return mockWsServer?.stop();
  });

  test('should create ControlAgent instance', () => {
    expect(controlAgent).toBeTruthy();
    expect(controlAgent.id).toBe('testControlAgent');
  });

  test('should initialize ControlAgent', async () => {
    expect(controlAgent['_callbackFns']).toBe(callbacks);
  });

  test('should open WebSocket connection', async () => {
    expect(logger.info).toHaveBeenCalledWith('testControlAgent websocket connected');
    expect(mockWsServer.clients()).toHaveLength(1);
  });

  test('should close socket on error', async () => {
    const closeSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'close');
    mockWsServer.emit('error', {});
    await wait();
    expect(closeSpy).toHaveBeenCalled();
  });

  test('should reject opening WebSocket connection if it is already open', async () => {
    await expect(controlAgent.open()).rejects.toThrow('WebSocket is already open');
  });

  test('should close WebSocket connection', async () => {
    const closeSpy = jest.spyOn(controlAgent['_ws']!, 'close');
    await controlAgent.close();
    expect(closeSpy).toHaveBeenCalled();
    expect(logger.info).toHaveBeenLastCalledWith('websocket is closed', { isOK: true });
  });

  test('should send message', async () => {
    const sendSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'send');
    controlAgent.send('test message');
    await wait();
    expect(sendSpy).toHaveBeenCalledWith('test message');
    expect(serverReceivedMessages).toHaveLength(1);
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent sending message', { data: 'test message' });
  });

  test('should serialise message if not a string', async () => {
    const sendSpy = controlAgent['_ws'] && jest.spyOn(controlAgent['_ws'], 'send');
    controlAgent.send({ test: 'message' });
    await wait();
    expect(sendSpy).toHaveBeenCalledWith('{"test":"message"}');
  });

  test('should log error if send throws', async () => {
    const error = new Error('test error');
    jest.spyOn(controlAgent['_ws']!, 'send').mockImplementation(() => {
      throw error;
    });
    controlAgent.send('test message');
    await wait();
    expect(logger.error).toHaveBeenCalledWith('testControlAgent failed to send message', error);
  });

  test('should receive a single message', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    const expected = deserialise(certsMsg);
    setTimeout(async () => {
      mockWsServer.emit('message', certsMsg);
    }, 100);
    controlAgent['_timeout'] = 1_000;
    const received = await controlAgent.receive();
    expect(received).toEqual(expected);
  });

  test('should throw if timed out receiving a single message', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    setTimeout(async () => {
      mockWsServer.emit('message', certsMsg);
    }, 2000);
    controlAgent['_timeout'] = 1_000;
    await expect(controlAgent.receive()).rejects.toThrow('testControlAgent timed out waiting for message');
  });

  test('should throw if invalid message is received for a single message', async () => {
    const modified = stringify({ invalid: 'message' });
    setTimeout(async () => {
      mockWsServer.emit('message', modified);
    }, 100);
    controlAgent['_timeout'] = 1_000;
    await expect(controlAgent.receive()).rejects.toThrow('Invalid WS response format');
  });

  test('should load certificates', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    mockSocket.on('message', (data) => {
      const msg = deserialise(data as string);
      if (msg.msg === 'CONFIGURATION') {
        mockSocket.send(certsMsg);
      }
    });
    const actual = await controlAgent.loadCerts();
    expect(actual).toStrictEqual(certs.outbound.tls.creds);
    expect(callbacks.onCert).toHaveBeenCalledWith(actual);
  });

  test('should throw if invalid message received in loadCerts', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    mockSocket.on('message', (data) => {
      const msg = deserialise(data as string);
      if (msg.msg === 'CONFIGURATION') {
        mockSocket.send(certsMsg.replace('outbound', 'INVALID'));
      }
    });
    await expect(controlAgent.loadCerts()).rejects.toThrow('Failed to read initial certs from testControlAgent');
  });

  test('should trigger fetchPeerJws', async () => {
    const sendSpy = jest.spyOn(controlAgent, 'send');
    const readSpy = jest.spyOn(controlAgent.build.PEER_JWS, 'READ');
    controlAgent.triggerFetchPeerJws();

    expect(readSpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalled();
    await wait();
    expect(serverReceivedMessages).toHaveLength(1);
  });

  test('should send peer JWS message', async () => {
    const sendSpy = jest.spyOn(controlAgent, 'send');
    const peerJwsCerts: ICAPeerJWSCert[] = peerJWSCertsDto();
    controlAgent.sendPeerJWS(peerJwsCerts);
    await wait();
    const actual = sendSpy.mock.calls[0]?.[0];
    expect(serverReceivedMessages).toHaveLength(1);
    expect(actual).toContain(stringify(peerJwsCerts));
  });

  test('should handle error if deserialisation fails in _handle', async () => {
    const error = new Error('test error');
    jest.spyOn(controlAgent as any, '_deserialise').mockImplementation(() => {
      throw error;
    });
    controlAgent['_handle']('test message');
    await wait();
    expect(logger.error).toHaveBeenCalledWith("testControlAgent couldn't parse received message", {
      data: 'test message',
    });
  });

  test('should handle incoming configuration message', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    const expected = { msg: deserialise(certsMsg) };
    mockWsServer.emit('message', certsMsg);
    await wait();
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent received ', expected);
    expect(callbacks.onCert).toHaveBeenCalledWith(ControlAgent.extractCerts(certs));
  });

  test('should handle configuration message with unsupported verb', async () => {
    const certs = mtlsCertsDto();
    const certsMsg = controlAgent.build.CONFIGURATION.NOTIFY(certs as any);
    const modified = certsMsg.replace('NOTIFY', 'UNSUPPORTED');
    const expected = { msg: deserialise(modified) };
    const sendSpy = jest.spyOn(controlAgent, 'send');
    mockWsServer.emit('message', modified);
    await wait();
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent received ', expected);
    expect(sendSpy).toHaveBeenCalledWith(controlAgent.build.ERROR.NOTIFY.UNSUPPORTED_VERB(expected.msg.id));
  });

  test('should handle incoming peerJWS message', async () => {
    const peerJWSCerts: ICAPeerJWSCert[] = peerJWSCertsDto();
    const peerJWSMsg = controlAgent.build.PEER_JWS.NOTIFY(peerJWSCerts);
    const expected = { msg: deserialise(peerJWSMsg) };
    mockWsServer.emit('message', peerJWSMsg);
    await wait();
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent received ', expected);
    expect(callbacks.onPeerJWS).toHaveBeenCalledWith(peerJWSCerts);
  });

  test('should handle peerJWS message with unsupported verb', async () => {
    const peerJWSCerts: ICAPeerJWSCert[] = peerJWSCertsDto();
    const peerJWSMsg = controlAgent.build.PEER_JWS.NOTIFY(peerJWSCerts);
    const modified = peerJWSMsg.replace('NOTIFY', 'UNSUPPORTED');
    const expected = { msg: deserialise(modified) };
    const sendSpy = jest.spyOn(controlAgent, 'send');
    mockWsServer.emit('message', modified);
    await wait();
    expect(logger.debug).toHaveBeenCalledWith('testControlAgent received ', expected);
    expect(sendSpy).toHaveBeenCalledWith(controlAgent.build.ERROR.NOTIFY.UNSUPPORTED_VERB(expected.msg.id));
  });

  test('should handle incoming error message', async () => {
    const errorMsg = stringify({ msg: 'ERROR', data: 'test error', id: 'testId' });
    const expected = { msg: deserialise(errorMsg) };
    mockWsServer.emit('message', errorMsg);
    await wait();
    expect(logger.warn).toHaveBeenCalledWith('testControlAgent received error message', expected);
  });

  test('should handle unsupported message', async () => {
    const errorMsg = stringify({ msg: 'ERROR', data: 'test error', id: 'testId' });
    const modified = errorMsg.replace('ERROR', 'UNSUPPORTED');
    const expected = { msg: deserialise(modified) };
    const sendSpy = jest.spyOn(controlAgent, 'send');
    mockWsServer.emit('message', modified);
    await wait();
    expect(sendSpy).toHaveBeenCalledWith(controlAgent.build.ERROR.NOTIFY.UNSUPPORTED_MESSAGE(expected.msg.id));
  });
});
