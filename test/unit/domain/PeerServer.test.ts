process.env.INBOUND_LISTEN_PORT_B = '14100';

import { setTimeout as sleep } from 'node:timers/promises';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { PeerServer, IHttpServer } from '#src/domain';
import { HealthcheckState } from '#src/infra';
import { createPeerServer } from '#src/createProxyAdapter';
import { HEALTH_STATUSES, INTERNAL_EVENTS, IN_ADVANCE_PERIOD_SEC } from '#src/constants';
import config from '#src/config';
import * as dto from '#src/dto';

import * as fixtures from '#test/fixtures';
import { injectHttpRequest, mockControlAgent } from '#test/utils';

const { peerBConfig } = config.get();
const mockAxios = new MockAdapter(axios);

const resetTokenEndpoint = (status = 200, token: unknown = fixtures.oidcTokenDto()) => {
  mockAxios.reset();
  mockAxios.onPost(`/${peerBConfig.authConfig.tokenEndpoint}`).reply(status, token);
};

const injectHealthCheckRequest = async (httpServer: IHttpServer) =>
  injectHttpRequest<HealthcheckState>(httpServer, '/health');

describe('PeerServer Tests -->', () => {
  let peer: PeerServer;

  beforeEach(() => {
    peer = createPeerServer(peerBConfig);
    mockControlAgent(peer);
    resetTokenEndpoint();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await peer?.stop();
  });

  test('should provide healthcheck endpoint with current state details (failed to get accessToken)', async () => {
    const { httpServer } = peer['deps'];
    peer['getAccessToken'] = async () => {
      throw new Error('Some error #2');
    };
    await peer.start();

    const { result, statusCode } = await injectHealthCheckRequest(httpServer);
    expect(result).toBeDefined();
    expect(result?.status).toBe(HEALTH_STATUSES.down);
    expect(result?.details.accessToken).toBe(false);
    expect(statusCode).toBe(502);
  });

  test('should return successful healthCheck state if all data exists', async () => {
    await peer.start();
    const { httpServer } = peer['deps'];
    httpServer.emit(INTERNAL_EVENTS.serverState, { certs: fixtures.certsJson.wrong });

    const { result, statusCode } = await injectHealthCheckRequest(httpServer);
    expect(result).toBeDefined();
    expect(result?.status).toBe(HEALTH_STATUSES.ok);
    expect(result?.details.accessToken).toBe(true);
    expect(result?.details.certs).toBe(true);
    expect(statusCode).toBe(200);
  });

  test('should provide predefined error response, if peerServer does not have proper state after start', async () => {
    peer['getAccessToken'] = async () => {
      throw new Error('Some error #3');
    };
    await peer.start();
    const { httpServer } = peer['deps'];

    const { result, statusCode } = await injectHttpRequest(httpServer);
    const errResponse = dto.errorResponsePeerFailedToStartDto();
    expect(statusCode).toBe(errResponse.status);
    expect(result).toEqual(errResponse.data);
  });

  test('should retry startPm4ml in case of error during starting peerServer', async () => {
    const { httpServer } = peer['deps'];
    // prettier-ignore
    peer['getAccessToken'] = jest.fn()
      .mockRejectedValueOnce(new Error('Some error for retryStartPm4ml'))
      .mockImplementationOnce(() => httpServer.emit(INTERNAL_EVENTS.serverState, { accessToken: 'accessToken' }));
    const retrySpy = jest.spyOn(peer as any, 'retryStartPm4ml');

    await peer.start();

    let { statusCode } = await injectHealthCheckRequest(httpServer);
    expect(retrySpy).toHaveBeenCalledTimes(1);
    expect(statusCode).toBe(502);

    await sleep(config.get('retryStartTimeoutSec') * 1000);
    ({ statusCode } = await injectHealthCheckRequest(httpServer));
    expect(statusCode).toBe(200);
  });

  test('should return unhealthy status in case of error during accessToken updates', async () => {
    const sec = 1;
    const oidcToken = fixtures.oidcTokenDto({ expires_in: IN_ADVANCE_PERIOD_SEC + sec });
    resetTokenEndpoint(200, oidcToken);

    await peer.start();
    resetTokenEndpoint(500, {});
    await sleep((sec + 2) * 1000); // wait for accessToken updates to fail

    const { result, statusCode } = await injectHealthCheckRequest(peer['deps'].httpServer);
    expect(statusCode).toBe(502);
    expect(result?.details.accessToken).toBe(false);
    expect(result?.details.isReady).toBe(false);
    expect(result?.details.certs).toBe(true);
  });

  test('should not send peerJWS event, if peerServer is not started', async () => {
    peer['getAccessToken'] = async () => {
      throw new Error('Some error for retryStart');
    };
    const { controlAgent } = peer['deps'];
    const peerJWSSpy = jest.spyOn(controlAgent, 'sendPeerJWS');
    await peer.start();

    peer.propagatePeerJWSEvent({ peerJWS: fixtures.peerJWSCertsDto() });
    expect(peerJWSSpy).not.toHaveBeenCalled();
  });
});
