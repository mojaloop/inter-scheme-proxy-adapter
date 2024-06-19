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

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

import https from 'node:https';
import axios from 'axios'; // todo: add wrapper
import config from '#src/config';
import { PROXY_HEADER, AUTH_HEADER } from '#src/constants';
import { loggerFactory } from '#src/utils';

import certs from '#test/certs.json';

const PROXY_HOST = 'http://localhost';
const { serverAConfig, hubAConfig, PROXY_ID } = config.get();

const logger = loggerFactory('ISPA Tests');

const checkProxyServiceHeaders = (headers: Record<string, unknown>) => {
  expect(headers[PROXY_HEADER.toLowerCase()]).toBe(PROXY_ID);
  expect(headers[AUTH_HEADER.toLowerCase()]).toMatch(/^Bearer /);
  // todo: add possibility to validate token value
};

const sendRequest = async (options: axios.AxiosRequestConfig) =>
  axios.request(options).catch((err) => {
    logger.warn('error on sending mTLS request', err);
    return err;
  });

describe('ISPA Integration Tests -->', () => {
  test('e2e positive flow with POST call to hub A', async () => {
    const path = '/api/int-test';
    const payload = { value: 'testA' };
    const headers = { h1: 'testA' };
    const url = `${PROXY_HOST}:${serverAConfig.port}${path}`;

    // data is "echo" of initial request
    const { status, data } = await sendRequest({
      method: 'POST',
      url,
      headers,
      data: payload,
    });
    expect(status).toBe(200);
    checkProxyServiceHeaders(data.headers);
    expect(data.path).toBe(path);
    expect(data.body).toEqual(payload);
    expect(data.headers.h1).toBe(headers.h1);
  });

  describe('mTLS hub (peer-endpoint) Tests -->', () => {
    const url = `${hubAConfig.baseUrl}/int-test`;
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
        ...certs.wrongClient,
        rejectUnauthorized: false,
        keepAlive: true,
        timeout: 5000,
      });
      const response = await sendGetRequest({ httpsAgent });
      expect(response).toBeInstanceOf(Error);
      // expect(response.message).toBe('socket hang up');
      // todo: clarify, why the error message sometimes is different on ci/cd:
      //  - "Client network socket disconnected before secure TLS connection was established"
    });
  });
  // todo: add negative scenario with wrong auth token
});
