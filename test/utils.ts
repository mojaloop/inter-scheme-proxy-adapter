import { IHttpServer, PeerServer } from '#src/domain';
import * as fixtures from '#test/fixtures';

export const mockControlAgent = (peer: PeerServer) => {
  const deps = peer['deps'];
  expect(deps).toBeTruthy();
  deps.controlAgent['open'] = async () => {};
  deps.controlAgent['close'] = async () => {};
  deps.controlAgent['loadCerts'] = async () => ({ ...fixtures.certsJson.wrong });
  deps.controlAgent['triggerFetchPeerJws'] = () => {};
  // todo: find a better way to mock MenAPI (ws) functionality
};

export const injectHttpRequest = async <T>(
  httpServer: IHttpServer,
  url = '/',
  method = 'GET',
  headers = {},
  payload = undefined,
) => httpServer.hapiServer.inject<T>({ url, method, headers, payload });
