import WebSocket from 'ws';
import { ILogger } from '../../domain/types';
import { MESSAGE, VERB } from './constants';

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
  send: (message: string) => void;
  receive: (validate: boolean) => Promise<GenericObject>;
  loadCerts: () => Promise<ICACerts>;
  triggerFetchPeerJws: () => void;
  sendPeerJWS: (peerJWS: ICAPeerJWSCert[]) => void;
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
  reconnectInterval: number;
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
export interface ICACerts {
  cert: string;
  key: string;
  ca: string;
}

/**************************************************************************
 * ICAPeerJWSCerts
 *
 * Interface for the peer JWS certificates
 **************************************************************************/

export interface ICAPeerJWSCert {
  createdAt: number;
  dfspId: string;
  publicKey: string;
}

/**************************************************************************
 * ICCallbacks
 *
 * Interface for the callbacks to be implemented by the client
 *
 * onCert - callback for when a certificate is received
 *************************************************************************/
export interface ICACallbacks {
  onCert: (certs: ICACerts) => void;
  onPeerJWS: (peerJWS: ICAPeerJWSCert[]) => void;
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
  outbound: {
    tls: {
      creds: ICACerts;
    };
  };
}

/**************************************************************************
 * GenericObject
 *
 * Interface for a generic object
 *************************************************************************/
export type GenericObject = Record<string, unknown>;

type GenericWsData = unknown;

export type WsPayload = {
  verb: VERB;
  msg: MESSAGE;
  data: GenericWsData;
  id: string;
};

export type CertsWsPayload = WsPayload & {
  verb: VERB.NOTIFY;
  msg: MESSAGE.CONFIGURATION;
  data: IMCMCertData;
};

/**************************************************************************
 * Type Guards
 *************************************************************************/
export const isWsPayload = (payload: unknown): payload is WsPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const p = payload as WsPayload;
  // prettier-ignore
  return Object.values(VERB).includes(p.verb)
    && Object.values(MESSAGE).includes(p.msg)
    && Object.hasOwn(payload, 'data');
};

export const isCertsPayload = (payload: WsPayload): payload is CertsWsPayload => {
  const p = payload as CertsWsPayload;
  // prettier-ignore
  return p.verb === VERB.NOTIFY
    && p.msg === MESSAGE.CONFIGURATION
    && Boolean(p.data?.outbound?.tls?.creds);
};
