import { ISPAService, ISPAServiceInterface } from '#src/domain';
import { PROXY_HEADER, AUTH_HEADER, SCHEME_HTTPS } from '#src/constants';
import { logger } from '#src/utils';
import config from '#src/config';
import * as fixtures from '#test/fixtures';

const { peerEndpoint } = config.get('peerAConfig');

describe('ISPAService Tests -->', () => {
  let service: ISPAServiceInterface;

  beforeEach(() => {
    service = new ISPAService({ logger });
  });

  test('should return correct proxy details', () => {
    const path = 'api/test';
    const query = 'query=test';
    const headers = { h1: 'test' };
    const reqDetails = fixtures.requestDetailsDto({
      path,
      query,
      headers,
      peerEndpoint,
    });
    const serverState = fixtures.serverStateDto();

    const proxyTarget = service.getProxyTarget(reqDetails, serverState);

    expect(proxyTarget.url).toBe(`${SCHEME_HTTPS}://${peerEndpoint}/${path}?${query}`);
    expect(proxyTarget.headers).toEqual({
      ...headers,
      [PROXY_HEADER]: config.get('PROXY_ID'),
      [AUTH_HEADER]: `Bearer ${serverState.accessToken}`,
    });
  });

  test('should remove some specific headers', () => {
    const headers = {
      host: 'test-host',
      'content-length': '1234',
    } as any; // todo: add typings for requestDetailsDto, and remove "as any"
    const reqDetails = fixtures.requestDetailsDto({ headers });
    const proxyTarget = service.getProxyTarget(reqDetails, fixtures.serverStateDto());

    expect(proxyTarget.headers.host).toBeUndefined();
    expect(proxyTarget.headers['content-length']).toBeUndefined();
  });

  test('should remove headers, specified through env var', () => {
    const h1 = config.get('incomingHeadersRemoval')[0] as string;
    expect(typeof h1).toBe('string');

    const headers = {
      [h1]: 'test-host',
    } as any; // todo: add typings for requestDetailsDto, and remove "as any"
    const reqDetails = fixtures.requestDetailsDto({ headers });
    const proxyTarget = service.getProxyTarget(reqDetails, fixtures.serverStateDto());

    expect(proxyTarget.headers[h1]).toBeUndefined();
  });
});
