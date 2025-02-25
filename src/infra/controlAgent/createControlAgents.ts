import { PeerLabel, ILogger } from '../../domain';
import { ControlAgentConfig } from '../types';
import { ControlAgent } from './index';

type createControlAgentDeps = {
  peer: PeerLabel;
  controlAgentConfig: ControlAgentConfig;
  logger: ILogger;
  // think, if it's better to pass config here
};

export const createControlAgent = (deps: createControlAgentDeps) => {
  const id = `controlAgent-${deps.peer}`;
  const { wsHost, wsPort, connectionTimeout, timeout, reconnectInterval } = deps.controlAgentConfig;

  return new ControlAgent({
    id,
    address: wsHost,
    port: wsPort,
    connectionTimeout,
    timeout,
    reconnectInterval,
    logger: deps.logger.child(id),
  });
};
