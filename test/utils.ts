import { IHttpServer, PeerServer } from '#src/domain';
import { ICACallbacks } from '#src/infra';
import * as fixtures from '#test/fixtures';

export const mockControlAgent = (peer: PeerServer, certs = { ...fixtures.certsJson.wrong }) => {
  const deps = peer['deps'];
  expect(deps).toBeTruthy();
  deps.controlAgent['init'] = async (cbs: ICACallbacks) => {
    cbs.onCert(certs);
  };
  deps.controlAgent['open'] = async () => {};
  deps.controlAgent['close'] = async () => {};
  deps.controlAgent['loadCerts'] = async () => certs;
  deps.controlAgent['triggerFetchPeerJws'] = () => {};
  // todo: find a better way to mock ManAPI (ws) functionality
};

export const injectHttpRequest = async <T>(
  httpServer: IHttpServer,
  url = '/',
  method = 'GET',
  headers = {},
  payload: object | undefined = undefined,
) => httpServer.hapiServer.inject<T>({ url, method, headers, payload });
