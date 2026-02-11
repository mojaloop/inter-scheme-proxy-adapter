/*****
 License
 --------------
 Copyright © 2020-2026 Mojaloop Foundation
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

import { EventEmitter } from 'node:events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInstances: any[] = [];

jest.mock('ws', () => {
  class MockWebSocket extends EventEmitter {
    readyState: number;
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor() {
      super();
      this.readyState = MockWebSocket.CONNECTING;
      mockInstances.push(this);
    }

    close() {
      this.readyState = MockWebSocket.CLOSED;
    }

    send() {}
  }

  return {
    __esModule: true,
    default: MockWebSocket,
    WebSocket: MockWebSocket,
  };
});

import { ControlAgent } from '#src/infra/controlAgent';
import { PING_INTERVAL_MS } from '#src/infra/controlAgent/constants';
import { logger } from '#src/utils';

describe('ControlAgent connection Tests -->', () => {
  const createParams = (overrides = {}) => ({
    id: 'testCA',
    address: 'localhost',
    port: 9999,
    logger,
    connectionTimeout: 1000,
    timeout: 5000,
    reconnectInterval: 1000,
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockInstances.length = 0;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('open connection failure tests', () => {
    test('should reject when WebSocket emits error before open', async () => {
      const ca = new ControlAgent(createParams());
      const openPromise = ca.open();

      const error = new Error('connect ECONNREFUSED');
      const ws = mockInstances[0]!;
      ws.emit('error', error);

      await expect(openPromise).rejects.toThrow(error.message);
    });

    test('should reject when WebSocket closes before open event fires', async () => {
      const ca = new ControlAgent(createParams());
      const openPromise = ca.open();

      const ws = mockInstances[0]!;
      ws.emit('close');

      await expect(openPromise).rejects.toThrow('WebSocket closed before connection established');
    });

    test('should not reject twice if error fires then close fires', async () => {
      const ca = new ControlAgent(createParams());
      const openPromise = ca.open();

      const error = new Error('connect ECONNREFUSED');
      const ws = mockInstances[0]!;
      ws.emit('error', error);
      ws.emit('close');

      await expect(openPromise).rejects.toThrow(error);
    });

    test('should schedule ping only after connection, not before', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const timeout = 5000;
      const pingDelay = PING_INTERVAL_MS + timeout;
      const getPingCalls = () => setTimeoutSpy.mock.calls.filter(([, ms]) => ms === pingDelay);

      const ca = new ControlAgent(createParams({ timeout }));
      const openPromise = ca.open();

      // no ping timer before 'open' fires
      expect(getPingCalls()).toHaveLength(0);

      const ws = mockInstances[0]!;
      ws.emit('open');
      await openPromise;

      // 1 ping timer after 'open' fires
      expect(getPingCalls()).toHaveLength(1);
    });
  });

  describe('ws cleanup on re-open', () => {
    test('should clean up old ws when open() is called again', async () => {
      const ca = new ControlAgent(createParams());

      // First connection
      const p1 = ca.open();
      const ws1 = mockInstances[0]!;
      ws1.readyState = 1; // OPEN
      ws1.emit('open');
      await p1;

      const removeAllListenersSpy = jest.spyOn(ws1, 'removeAllListeners');
      const closeSpy = jest.spyOn(ws1, 'close');

      // Second connection
      const p2 = ca.open();

      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();

      const ws2 = mockInstances[1];
      expect(ws2).toBeDefined();
      expect(ws2).not.toBe(ws1);

      ws2.emit('open');
      await p2;
    });

    test('should not leak listeners from old WebSocket', async () => {
      const ca = new ControlAgent(createParams());

      // First connection
      const p1 = ca.open();
      const ws1 = mockInstances[0]!;
      ws1.emit('open');
      await p1;

      expect(ws1.listenerCount('open')).toBeGreaterThan(0);

      // Second connection
      const p2 = ca.open();
      const ws2 = mockInstances[1];

      ws2.emit('open');
      await p2;

      // old ws should have no listeners
      expect(ws1.listenerCount('open')).toBe(0);
      expect(ws1.listenerCount('close')).toBe(0);
      expect(ws1.listenerCount('error')).toBe(0);
      expect(ws1.listenerCount('message')).toBe(0);
    });
  });

  describe('reconnection after established connection drops', () => {
    test('should schedule reconnect when established connection closes', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const timeout = 5000;
      const pingDelay = PING_INTERVAL_MS + timeout;
      const getPingCalls = () => setTimeoutSpy.mock.calls.filter(([, ms]) => ms === pingDelay);

      const ca = new ControlAgent(createParams({ timeout }));

      const p = ca.open();
      const ws = mockInstances[0]!;
      ws.emit('open');
      await p;

      setTimeoutSpy.mockClear();
      ws.emit('close'); // simulate connection drop

      expect(getPingCalls()).toHaveLength(1);
    });

    test('should attempt reconnection when ping timeout fires after connection drop', async () => {
      const timeout = 5000;
      const ca = new ControlAgent(createParams({ timeout }));

      const p = ca.open();
      const ws1 = mockInstances[0]!;
      ws1.emit('open');
      await p;

      // Simulate connection drop
      ws1.emit('close');

      // Advance time to trigger the ping timeout
      jest.advanceTimersByTime(PING_INTERVAL_MS + timeout + 1);

      // new ws should have been created (reconnection attempt)
      expect(mockInstances.length).toBeGreaterThan(1);
    });
  });
});
