import { ILogger } from '../../domain';

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
  id: string;
  init: (cbs: ICACallbacks) => Promise<void>;
  open: () => Promise<void>;
  close: () => Promise<void>;
  send: (message: string) => Promise<unknown>;
  receive: () => Promise<GenericObject>;
  loadCerts: () => Promise<ICACerts>;
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
  timeout: number;
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
 * IMCMCertData
 *
 * Interface for the MCM certificate data
 *
 * outbound - outbound data
 * tls      - tls data
 * creds    - credentials
 *************************************************************************/
export interface IMCMCertData {
  outbound?: {
    tls?: {
      creds?: ICACerts;
    };
  };
}

/**************************************************************************
 * GenericObject
 *
 * Interface for a generic object
 *************************************************************************/
export type GenericObject = Record<string, unknown>;
