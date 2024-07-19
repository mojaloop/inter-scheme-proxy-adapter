jest.mock('ws');
jest.setTimeout(10_000);

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { InterSchemeProxyAdapter } from '#src/domain';
import { createProxyAdapter } from '#src/createProxyAdapter';
import { AUTH_HEADER, PROXY_HEADER } from '#src/constants';
import config from '#src/config';

import * as fixtures from '#test/fixtures';

const mockAxios = new MockAdapter(axios);

describe('InterSchemeProxyAdapter Tests -->', () => {
  const oidcToken = fixtures.oidcTokenDto();

  let proxyAdapter: InterSchemeProxyAdapter;

  beforeEach(async () => {
    mockAxios.reset();
    mockAxios.onPost(`/${config.get('authConfigA').tokenEndpoint}`).reply(200, oidcToken);
    mockAxios.onPost(`/${config.get('authConfigB').tokenEndpoint}`).reply(200, oidcToken);

    proxyAdapter = createProxyAdapter(config);
    const deps = proxyAdapter['deps'];
    expect(deps).toBeTruthy();
    deps.controlAgentA['open'] = async () => {};
    deps.controlAgentB['open'] = async () => {};
    deps.controlAgentA['loadCerts'] = async () => ({ ...fixtures.certsJson.wrong });
    deps.controlAgentB['loadCerts'] = async () => ({ ...fixtures.certsJson.wrong });
    deps.controlAgentA['triggerFetchPeerJws'] = () => {};
    deps.controlAgentB['triggerFetchPeerJws'] = () => {};
    // todo: find a better way to mock MenAPI (ws) functionality
  });

  afterEach(async () => {
    await proxyAdapter?.stop();
  });

  test('should proxy incoming request with proper headers', async () => {
    const deps = proxyAdapter['deps'];
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

    const response = await deps.httpServerA.hapiServer.inject({
      url: '/test-route',
      method: 'GET',
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.result).toEqual(mockHubResponse);
    await proxyAdapter.stop();
  });

  test('should not set any default headers', async () => {
    const headers = {};
    await proxyAdapter.start();

    let acceptHeader;
    mockAxios.onAny().reply(async (reqOptions: axios.AxiosRequestConfig) => {
      acceptHeader = reqOptions.headers?.Accept || reqOptions.headers?.accept;
      return [200, null];
    });

    const { httpServerA } = proxyAdapter['deps'];
    await httpServerA.hapiServer.inject({
      url: '/',
      method: 'GET',
      headers,
    });

    expect(acceptHeader).toBeUndefined();
  });
});
