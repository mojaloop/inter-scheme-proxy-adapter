import { Config } from 'convict';
import { InterSchemeProxyAdapter, ISPAService } from './domain';
import { AuthClient, createControlAgents, createHttpServers, httpRequest, AppConfig } from './infra';
import { loggerFactory } from './utils';

export const createProxyAdapter = (config: Config<AppConfig>) => {
  const { PROXY_ID, authConfigA, authConfigB } = config.get();
  const logger = loggerFactory(`ISPA-${PROXY_ID}`);

  const { httpServerA, httpServerB } = createHttpServers({ logger });
  const { controlAgentA, controlAgentB } = createControlAgents({ logger });

  const authClientA = new AuthClient({ logger, authConfig: authConfigA });
  const authClientB = new AuthClient({ logger, authConfig: authConfigB });
  const ispaService = new ISPAService({ logger });

  return new InterSchemeProxyAdapter({
    ispaService,
    authClientA,
    authClientB,
    controlAgentA,
    controlAgentB,
    httpServerA,
    httpServerB,
    httpRequest,
    logger,
  });
};
