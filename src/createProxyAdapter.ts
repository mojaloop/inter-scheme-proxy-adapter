import { Config } from 'convict';
import { InterSchemeProxyAdapter, ISPADeps, PeerServer, ProxyService, InboundPingService } from './domain';
import { logger as globalLogger } from './utils';
import {
  AppConfig,
  AuthClient,
  configureAxios,
  createControlAgent,
  createHttpServer,
  createMlPingRequestsFactory,
  HttpClient,
  PeerServerConfig,
} from './infra';

export const createPeerServer = (peerConfig: PeerServerConfig, proxyId: string) => {
  const { peer, peerEndpoint, pingCallbackEndpoint, authConfig, controlAgentConfig, serverConfig } = peerConfig;

  const logger = globalLogger.child({ peer });
  const axiosInstance = configureAxios({ logger });
  const httpClient = new HttpClient({ axiosInstance, logger });

  const proxyService = new ProxyService({ httpClient, logger });
  const authClient = new AuthClient({ axiosInstance, authConfig, logger });
  const controlAgent = createControlAgent({ peer, controlAgentConfig, logger });

  const pingService = new InboundPingService({
    proxyId,
    logger,
    createMlPingRequests: createMlPingRequestsFactory({
      logger,
      proxyId,
      pingCallbackEndpoint,
      mTlsEnabled: true, // todo: make it configurable
    }),
  });
  const httpServer = createHttpServer({
    serverConfig,
    peerEndpoint,
    pingService,
    logger,
  });

  return new PeerServer({
    proxyService,
    authClient,
    controlAgent,
    httpServer,
    pingService,
    logger,
  });
};

export const createProxyAdapter = (config: Config<AppConfig>, deps: Partial<ISPADeps> = {}) => {
  const proxyId = config.get('PROXY_ID');
  const peerA = deps.peerA || createPeerServer(config.get('peerAConfig'), proxyId);
  const peerB = deps.peerB || createPeerServer(config.get('peerBConfig'), proxyId);

  return new InterSchemeProxyAdapter({
    peerA,
    peerB,
    logger: globalLogger,
  });
};
