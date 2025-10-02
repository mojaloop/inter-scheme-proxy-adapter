import { Agent, AgentOptions } from 'node:https';
import { TlsOptions } from '../types';

export const GRACEFUL_AGENT_SHUTDOWN_MS = 5000;
// todo: make configurable
const defaultHttpsAgentConfig: AgentOptions = {
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 50,
  timeout: 25_000,
} as const;

// todo: think, if we need runtime validation of certs here
export const createHttpsAgent = (certs: TlsOptions) =>
  new Agent({
    ...defaultHttpsAgentConfig,
    ...certs,
  });
