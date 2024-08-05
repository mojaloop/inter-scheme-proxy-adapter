jest.mock('ws');
jest.setTimeout(10_000);

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { InterSchemeProxyAdapter, PeerServer } from '#src/domain';
import { createProxyAdapter, createPeerServer } from '#src/createProxyAdapter';
import { AUTH_HEADER, PROXY_HEADER } from '#src/constants';
import config from '#src/config';
import * as fixtures from '#test/fixtures';

const mockAxios = new MockAdapter(axios);

const { peerAConfig, peerBConfig } = config.get();

const mockControlAgent = (peer: PeerServer) => {
  const deps = peer['deps'];
  expect(deps).toBeTruthy();
  deps.controlAgent['open'] = async () => {};
  deps.controlAgent['close'] = async () => {};
  deps.controlAgent['loadCerts'] = async () => ({ ...fixtures.certsJson.wrong });
  deps.controlAgent['triggerFetchPeerJws'] = () => {};
  // todo: find a better way to mock MenAPI (ws) functionality
};

const oidcToken = fixtures.oidcTokenDto();

describe('InterSchemeProxyAdapter Tests -->', () => {
  let peerA: PeerServer;
  let peerB: PeerServer;
  let proxyAdapter: InterSchemeProxyAdapter;

  beforeEach(async () => {
    mockAxios.reset();
    mockAxios.onPost(`/${peerAConfig.authConfig.tokenEndpoint}`).reply(200, oidcToken);
    mockAxios.onPost(`/${peerBConfig.authConfig.tokenEndpoint}`).reply(200, oidcToken);

    peerA = createPeerServer(peerAConfig);
    peerB = createPeerServer(peerBConfig);
    proxyAdapter = createProxyAdapter(config, { peerA, peerB });

    mockControlAgent(peerA);
    mockControlAgent(peerB);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await proxyAdapter?.stop();
  });

  test('should proxy incoming request with proper headers', async () => {
    const deps = peerA['deps'];
    await proxyAdapter.start();
    // todo: think, if we need to avoid actual port listening in tests

    const headers = { test: 'incoming header' };
    const mockHubResponse = { data: 'from hub A' };

    // todo: try to intercept only on /test-route requests, instead of onAny()
    mockAxios.onAny().reply(async (reqOptions: axios.AxiosRequestConfig) => {
      deps.logger.info('incoming hub request headers:', reqOptions.headers);
      if (!reqOptions?.headers) throw new Error('No headers in request');

      expect(reqOptions.headers[PROXY_HEADER]).toBe(config.get('PROXY_ID'));
      expect(reqOptions.headers[AUTH_HEADER]).toBe(`Bearer ${oidcToken.access_token}`);
      expect(reqOptions.headers.test).toBe(headers.test);

      return [200, mockHubResponse];
    });

    const response = await deps.httpServer.hapiServer.inject({
      url: '/test-route',
      method: 'GET',
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.result).toEqual(mockHubResponse);
  });

  test('should not set any default headers', async () => {
    const headers = {};
    await proxyAdapter.start();

    let acceptHeader;
    mockAxios.onAny().reply(async (reqOptions: axios.AxiosRequestConfig) => {
      acceptHeader = reqOptions.headers?.Accept || reqOptions.headers?.accept;
      return [200, null];
    });

    const { httpServer } = peerA['deps'];
    await httpServer.hapiServer.inject({
      url: '/',
      method: 'GET',
      headers,
    });

    expect(acceptHeader).toBeUndefined();
  });

  test('should not throw error if a peer failed to start (config is correct)', async () => {
    peerA['getAccessToken'] = async () => {
      throw new Error('Some error');
    };
    const aStartSpy = jest.spyOn(peerA, 'start');
    await proxyAdapter.start();

    expect(aStartSpy).toHaveBeenCalledTimes(1);
    const isAok = await aStartSpy.mock.results[0]?.value;
    expect(isAok).toBe(false);
  });
});
