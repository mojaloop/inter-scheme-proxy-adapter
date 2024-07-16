import { ILogger } from '../../domain';
import { ControlAgent } from './index';
import { IControlAgent } from './types';
import config from '../../config';

type controlAgentsMap = Readonly<{
  controlAgentA: IControlAgent;
  controlAgentB: IControlAgent;
}>;

type createControlAgentsDeps = {
  logger: ILogger;
  // think, if it's better to pass config here
};

export const createControlAgents = (deps: createControlAgentsDeps): controlAgentsMap => {
  const { controlAgentAConfig, controlAgentBConfig } = config.get();

  const idA = 'ControlAgentA';
  const controlAgentA = new ControlAgent({
    id: idA,
    address: controlAgentAConfig.wsHost,
    port: controlAgentAConfig.wsPort,
    timeout: controlAgentAConfig.timeout,
    logger: deps.logger.child(idA),
    reconnectInterval: controlAgentAConfig.reconnectInterval,
  });

  const idB = 'ControlAgentB';
  const controlAgentB = new ControlAgent({
    id: idB,
    address: controlAgentBConfig.wsHost,
    port: controlAgentBConfig.wsPort,
    timeout: controlAgentBConfig.timeout,
    logger: deps.logger.child(idB),
    reconnectInterval: controlAgentBConfig.reconnectInterval,
  });

  return Object.freeze({
    controlAgentA,
    controlAgentB,
  });
};
