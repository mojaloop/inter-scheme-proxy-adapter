import { ILogger } from '#src/types';
import { ControlAgent } from './index';
import { IControlAgent } from './types';
import config from '../../config';

type controlAgentsMap = Readonly<{
  controlAgentA: IControlAgent;
  controlAgentB: IControlAgent;
}>;

type createControlAgentsDeps = {
  logger: ILogger;
};

export const createControlAgents = async (deps: createControlAgentsDeps): Promise<controlAgentsMap> => {
  const { logger } = deps;
  const controlAgentA = new ControlAgent({
    address: config.get('serverAConfig').mgmtApi.host,
    port: config.get('serverAConfig').mgmtApi.port,
    logger: logger.child('controlAgentA'),
  });

  const controlAgentB = new ControlAgent({
    address: config.get('serverBConfig').mgmtApi.host,
    port: config.get('serverBConfig').mgmtApi.port,
    logger: logger.child('controlAgentB'),
  });

  return Object.freeze({
    controlAgentA,
    controlAgentB,
  });
};
