import ws, { WebSocket } from 'ws';
import { ILogger } from '../../domain';
import { MESSAGE, VERB } from './constants';
import { build, deserialise, serialise } from './mcm';
import {
  GenericObject,
  ICACallbacks,
  ICAParams,
  ICACerts,
  IControlAgent,
  IMCMCertData,
  WsPayload,
  isWsPayload,
  isCertsPayload,
  ICAPeerJWSCert,
} from './types';

/**************************************************************************
 * Client
 *
 * The Control Client. Client for the websocket control API.
 *
 * logger    - Logger- see SDK logger used elsewhere
 * address   - address of control server
 * port      - port of control server
 *************************************************************************/
export class ControlAgent implements IControlAgent {
  private _ws: WebSocket | null = null;
  private _id: string;
  private _logger: ILogger;
  private _address: string;
  private _port: number;
  private _callbackFns: ICACallbacks | null = null;
  private _timeout: number;
  private _reconnectInterval: number;
  private _shouldReconnect: boolean;

  constructor(params: ICAParams) {
    this._id = params.id || 'ControlAgent';
    this._address = params.address || 'localhost';
    this._port = params.port;
    this._logger = params.logger;
    this._timeout = params.timeout;
    this._shouldReconnect = true;
    this._reconnectInterval = params.reconnectInterval;
    this.receive = this.receive.bind(this);
  }

  get id() {
    return this._id;
  }

  get build() {
    return build;
  }

  init(cbs: ICACallbacks): Promise<void> {
    this._callbackFns = cbs;
    return this.open();
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        reject(new Error('WebSocket is already open'));
        return;
      }

      const url = this._port ? `${this._address}:${this._port}` : this._address;
      const protocol = this._address.includes('://') ? '' : 'ws://';

      this._ws = new WebSocket(`${protocol}${url}`);

      this._ws.on('open', () => {
        this._logger.info(`${this.id} websocket connected`, { url, protocol });
        resolve();
      });

      // Reconnect on close
      this._ws.on('close', () => {
        this._logger.warn(`${this.id} websocket disconnected`, { url, protocol });
        if (this._shouldReconnect) {
          this._logger.info(`${this.id} reconnecting in ${this._reconnectInterval}ms...`);
          setTimeout(() => this.open(), this._reconnectInterval);
        }
      });

      this._ws.on('error', (error) => {
        this._logger.error(`${this.id} websocket error`, { url, protocol, error });
        this._ws?.close();
      });

      this._ws.on('message', this._handle.bind(this));
    });
  }

  async close(): Promise<void> {
    await new Promise((resolve, reject) => {
      this._logger.info(`${this.id} shutting down...`);

      this._ws?.on('close', resolve);
      this._ws?.on('error', reject);

      this._shouldReconnect = false;
      this._ws?.close();
    });
    this._ws = null;
  }

  send(msg: string | GenericObject) {
    try {
      this._checkSocketState();

      const data = typeof msg === 'string' ? msg : this._serialise(msg);
      this._logger.debug(`${this.id} sending message`, { data });

      this._ws?.send(data);
    } catch (err) {
      this._logger.error(`${this.id} failed to send message`, { err });
    }
  }

  // Receive a single message
  receive(validate = true): Promise<WsPayload> {
    return new Promise((resolve, reject) => {
      this._checkSocketState();

      const timer = setTimeout(() => {
        reject(new Error(`${this.id} timed out waiting for message`));
      }, this._timeout);

      this._ws?.once('message', (data) => {
        const msg = this._deserialise(data);
        this._logger.verbose('WS message received once');

        if (validate) {
          const isValid = isWsPayload(msg);
          if (!isValid) {
            reject(new TypeError('Invalid WS response format'));
          }
        }

        resolve(msg);

        clearTimeout(timer);
      });
    });
  }

  async loadCerts(): Promise<ICACerts> {
    this.send(build.CONFIGURATION.READ());
    const res = await this.receive();

    const isCreds = isCertsPayload(res);
    if (!isCreds) {
      this._logger.warn('wrong verb or message in ws response', { res });
      throw new TypeError(`Failed to read initial certs from ${this.id}`);
    }
    return ControlAgent.extractCerts(res.data);
  }

  triggerFetchPeerJws(): void {
    this.send(build.PEER_JWS.READ());
  }

  static extractCerts(data: IMCMCertData): ICACerts {
    // current implementation is for the initial certs load
    return data.outbound.tls.creds;
    // todo: think, if it's make sense to add isCertsPayload here
  }

  sendPeerJWS(peerJWS: ICAPeerJWSCert[]) {
    this.send(build.PEER_JWS.NOTIFY(peerJWS));
  }

  private _checkSocketState() {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error(`${this.id} WebSocket is not open`);
    }
  }

  // wrapping the serialise and deserialise functions
  // to make them easier to mock in tests
  private _serialise(msg: GenericObject, ...args: any[]) {
    return serialise(msg, ...args);
  }

  private _deserialise(msg: string | ws.RawData) {
    return deserialise(msg);
  }

  private _handle(data: ws.RawData | string) {
    let msg;
    try {
      msg = this._deserialise(data);
      this._logger.debug(`${this.id} received `, { msg });
    } catch (err) {
      this._logger.error(`${this.id} couldn't parse received message`, { data });
      this.send(build.ERROR.NOTIFY.JSON_PARSE_ERROR());
      return;
    }
    switch (msg.msg) {
      case MESSAGE.CONFIGURATION:
        switch (msg.verb) {
          case VERB.NOTIFY:
          case VERB.PATCH: {
            if (isCertsPayload(msg)) {
              const certs = ControlAgent.extractCerts(msg.data);
              this._callbackFns?.onCert(certs);
            }
            break;
          }
          default:
            this.send(build.ERROR.NOTIFY.UNSUPPORTED_VERB(msg.id));
            break;
        }
        break;
      case MESSAGE.PEER_JWS:
        switch (msg.verb) {
          case VERB.NOTIFY: {
            this._callbackFns?.onPeerJWS(msg.data);
            break;
          }
          default:
            this.send(build.ERROR.NOTIFY.UNSUPPORTED_VERB(msg.id));
            break;
        }
        break;
      case MESSAGE.ERROR:
        this._logger.warn(`${this.id} received error message`, { msg });
        break;
      default:
        this.send(build.ERROR.NOTIFY.UNSUPPORTED_MESSAGE(msg.id));
        break;
    }
  }
}
