import { ILogger } from '#src/types';

/**************************************************************************
 * IControlAgent
 *
 * Interface for the Control Agent
 *
 * init   - initialises the control agent
 * open   - opens the control agent
 * close  - closes the control agent
 * send   - sends a message
 * receive- receives a message
 *************************************************************************/
export interface IControlAgent {
  init: (cbs: ICACallbacks) => void;
  open: () => Promise<void>;
  close: () => Promise<void>;
  send: (verb: string, message: GenericObject) => void;
  receive: () => Promise<string>;
}

/**************************************************************************
 * IControlAgentConstructor
 *
 * Interface for the constructor of the Control Agent
 *
 * params - parameters required to create the control agent
 *************************************************************************/
export interface IControlAgentConstructor {
  new (params: ICAParams): IControlAgent;
}

/**************************************************************************
 * IClientParams
 *
 * Interface for the parameters required to create a new Client instance
 *
 * address   - address of control server
 * port      - port of control server
 * logger    - Logger- see SDK logger used elsewhere
 *************************************************************************/
export interface ICAParams {
  id?: string;
  address?: string;
  port: number;
  logger: ILogger;
}

/**************************************************************************
 * ICCerts
 *
 * Interface for the certificates required to establish a secure connection
 *
 * cert  - certificate
 * key   - key
 * ca    - ca
 *************************************************************************/
export type ICACerts = {
  cert: string;
  key: string;
  ca: string;
};

/**************************************************************************
 * ICCallbacks
 *
 * Interface for the callbacks to be implemented by the client
 *
 * onCert - callback for when a certificate is received
 *************************************************************************/
export interface ICACallbacks {
  onCert: (certs: ICACerts) => void;
}

/**************************************************************************
 * GenericObject
 *
 * Interface for a generic object
 *************************************************************************/
export type GenericObject = Record<string, unknown>;
