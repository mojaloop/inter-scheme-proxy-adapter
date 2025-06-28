jest.mock('ws');
jest.setTimeout(10_000);

import { setTimeout as sleep } from 'node:timers/promises';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { InterSchemeProxyAdapter, PeerServer } from '#src/domain';
import { createProxyAdapter, createPeerServer } from '#src/createProxyAdapter';
import { HEADERS_FSPIOP, AUTH_HEADER } from '#src/constants';
import config from '#src/config';

import * as fixtures from '#test/fixtures';
import { mockControlAgent, injectHttpRequest } from '#test/utils';

const { peerAConfig, peerBConfig, PROXY_ID } = config.get();
const mockAxios = new MockAdapter(axios);

const oidcToken = fixtures.oidcTokenDto();

describe('InterSchemeProxyAdapter Tests -->', () => {
  let peerA: PeerServer;
  let peerB: PeerServer;
  let proxyAdapter: InterSchemeProxyAdapter;

  beforeEach(async () => {
    mockAxios.reset();
    mockAxios.onPost(`/${peerAConfig.authConfig.tokenEndpoint}`).reply(200, oidcToken);
    mockAxios.onPost(`/${peerBConfig.authConfig.tokenEndpoint}`).reply(200, oidcToken);

    peerA = createPeerServer(peerAConfig, PROXY_ID);
    peerB = createPeerServer(peerBConfig, PROXY_ID);
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

      expect(reqOptions.headers[HEADERS_FSPIOP.PROXY]).toBe(config.get('PROXY_ID'));
      expect(reqOptions.headers[AUTH_HEADER]).toBe(`Bearer ${oidcToken.access_token}`);
      expect(reqOptions.headers.test).toBe(headers.test);
      return [200, mockHubResponse];
    });

    const response = await injectHttpRequest(deps.httpServer, '/test-route', 'GET', headers);
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
    await injectHttpRequest(httpServer, '/', 'GET', headers);
    expect(acceptHeader).toBeUndefined();
  });

  test('should not throw error if a peerServer failed to start (config is correct)', async () => {
    peerA['getAccessToken'] = async () => {
      throw new Error('Some error');
    };
    const aStartSpy = jest.spyOn(peerA, 'start');
    await proxyAdapter.start();

    expect(aStartSpy).toHaveBeenCalledTimes(1);
    const isAok = await aStartSpy.mock.results[0]?.value;
    expect(isAok).toBe(false);
  });

  test('should handle POST /ping requests', async () => {
    const sourceId = 'hub-123';
    const requestId = '01JYTWZBDX4S2K91PR0KAZMYHT';

    let cbPayload;
    let cbDestination;
    mockAxios.onPut(`/ping/${requestId}`).reply((reqOpts: axios.AxiosRequestConfig) => {
      // !!! Do not perform assertions here, coz any failures won't be "visible" to Jest
      cbPayload = JSON.parse(reqOpts.data);
      cbDestination = reqOpts.headers?.[HEADERS_FSPIOP.DESTINATION];
      return [200];
    });

    await proxyAdapter.start();
    // prettier-ignore
    const result = await injectHttpRequest(
      peerA['deps'].httpServer,
      '/ping',
      'POST',
      fixtures.mockHeaders({ sourceId }),
      { requestId },
    );
    expect(result.statusCode).toBe(202);
    await sleep(1000); // wait for PUT /ping callback to be sent

    expect(cbPayload).toEqual({ requestId });
    expect(cbDestination).toBe(sourceId);
  });
});
