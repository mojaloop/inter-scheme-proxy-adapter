import https from 'node:https';
import axios from 'axios'; // add wrapper?

import config from '#src/config';
import { PROXY_HEADER, AUTH_HEADER, SCHEME_HTTPS, HEALTH_STATUSES } from '#src/constants';
import { loggerFactory } from '#src/utils';
import * as fixtures from '#test/fixtures';

const PROXY_HOST = 'http://localhost';
const logger = loggerFactory('ISPA Tests');
const { peerAConfig, PROXY_ID } = config.get();

const checkProxyServiceHeaders = (headers: Record<string, unknown>) => {
  expect(headers[PROXY_HEADER.toLowerCase()]).toBe(PROXY_ID);
  expect(headers[AUTH_HEADER.toLowerCase()]).toMatch(/^Bearer /);
  // add possibility to validate token value
};

const sendRequest = async (options: axios.AxiosRequestConfig) =>
  axios.request(options).catch((err) => {
    logger.warn('error on sending mTLS request', err);
    return err;
  });

describe('ISPA Integration Tests -->', () => {
  test('e2e positive flow with POST call to hub A', async () => {
    const path = '/api/int-test';
    const payload = { value: 'test1' };
    const headerName = 'test-header'; // (!) headers in response are always lowercased
    const headers = { [headerName]: 'test2' };
    const url = `${PROXY_HOST}:${peerAConfig.serverConfig.port}${path}`;

    const {
      status,
      data, // data is "echo" of initial request details: method, path, body, headers, query
      headers: responseHeaders,
    } = await sendRequest({
      method: 'POST',
      url,
      headers,
      data: payload,
    });
    logger.info('e2e positive flow response data:', { status, data, responseHeaders });
    expect(status).toBe(200);
    checkProxyServiceHeaders(data.headers);
    expect(data.path).toBe(path);
    expect(data.body).toEqual(payload);
    expect(data.headers[headerName]).toBe(headers[headerName]);

    Object.entries(fixtures.HUB_HEADERS).forEach(([header, value]) => {
      expect(responseHeaders[header]).toBe(value);
    });
  });

  test('should have healthcheck endpoint', async () => {
    const { status, data } = await sendRequest({
      url: `${PROXY_HOST}:${peerAConfig.serverConfig.port}/health`,
    });
    expect(status).toBe(200);
    expect(data.status).toBe(HEALTH_STATUSES.ok);
  });

  describe('mTLS hub (peer-endpoint) Tests -->', () => {
    const url = `${SCHEME_HTTPS}://${peerAConfig.peerEndpoint}/int-test`;
    logger.info('mTLS URL', { url });
    // prettier-ignore
    const sendGetRequest = (options: axios.AxiosRequestConfig) => sendRequest({
      ...options,
      method: 'GET',
      url
    });

    test('should fail when connect to https hub (peer-endpoint) without certs', async () => {
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const response = await sendGetRequest({ httpsAgent });
      expect(response).toBeInstanceOf(Error);
      expect(response.message).toMatch(/routines:ssl3_read_bytes:tlsv13 alert certificate required/);
    });

    test('should fail when connect to https hub (peer-endpoint) with wrong certs', async () => {
      const httpsAgent = new https.Agent({
        ...fixtures.certsJson.wrong,
        rejectUnauthorized: false,
      });
      const response = await sendGetRequest({ httpsAgent });
      expect(response).toBeInstanceOf(Error);
      expect(response.message).toBe('socket hang up');
      // sometimes the error message is different on ci/cd:
      //  "Client network socket disconnected before secure TLS connection was established"
    });
  });
  // todo: add negative scenario with wrong auth token
});
