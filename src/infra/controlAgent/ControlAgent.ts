import ws, { WebSocket } from 'ws';
import { ILogger } from '../../domain';
import { MESSAGE, VERB, PING_INTERVAL_MS } from './constants';
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

const WS_CLOSE_TIMEOUT_MS = 5_000;

type Timer = NodeJS.Timeout | undefined;

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
  private _logger: ILogger;
  private _callbackFns: ICACallbacks | null = null;
  private _id: string;
  private _address: string;
  private _port: number;
  private _timeout: number;
  private _shouldReconnect: boolean;
  private _pingTimeout: Timer;

  constructor(params: ICAParams) {
    this._id = params.id || 'ControlAgent';
    this._address = params.address || 'localhost';
    this._port = params.port;
    this._timeout = params.timeout;
    this._shouldReconnect = true;
    this._logger = params.logger;
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
    const url = this._port ? `${this._address}:${this._port}` : this._address;
    const protocol = this._address.includes('://') ? '' : 'ws://';
    const address = `${protocol}${url}`;

    const log = this._logger.child({ address });

    return new Promise((resolve, reject) => {
      const schedulePing = () => {
        clearTimeout(this._pingTimeout);
        this._pingTimeout = setTimeout(async () => {
          log.error('Ping timeout, possible broken connection. Restarting server...');
          await this.open();
          await this.loadCerts();
        }, PING_INTERVAL_MS + this._timeout);
      };
      schedulePing();

      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        reject(new Error('WebSocket is already open'));
        return;
      }

      this._ws = new WebSocket(address);

      this._ws.on('open', () => {
        log.info(`${this.id} websocket connected`);
        resolve();
      });

      this._ws.on('ping', () => {
        log.debug('Received ping from control server');
        schedulePing();
      });

      // Reconnect on close
      this._ws.on('close', () => {
        log.warn(`${this.id} websocket disconnected`);

        if (this._shouldReconnect) {
          schedulePing();
        }
      });

      this._ws.on('error', (error) => {
        log.error(`${this.id} websocket error [readyState: ${this._ws?.readyState}]`, error);
        this._ws?.close();
      });

      this._ws.on('message', this._handle.bind(this));
    });
  }

  async close(): Promise<void> {
    const log = this._logger;
    // think, if we need to rethrow in case of error?
    const isOK = await new Promise((resolve) => {
      clearTimeout(this._pingTimeout);
      log.verbose('shutting down websocket...', { WS_CLOSE_TIMEOUT_MS });

      const timer = setTimeout(() => {
        log.warn('websocket close timed out', { WS_CLOSE_TIMEOUT_MS });
        resolve(false);
      }, WS_CLOSE_TIMEOUT_MS);

      this._ws?.once('close', () => {
        clearTimeout(timer);
        resolve(true);
      });
      this._ws?.once('error', (err: Error) => {
        log.error('error on websocket close', err);
        clearTimeout(timer);
        resolve(false);
      });

      this._shouldReconnect = false;
      this._ws?.close();
    });

    this._ws = null;
    this._logger.info('websocket is closed', { isOK });
  }

  send(msg: string | GenericObject) {
    try {
      this._checkSocketState();

      const data = typeof msg === 'string' ? msg : this._serialise(msg);
      this._logger.debug(`${this.id} sending message`, { data });

      this._ws?.send(data);
    } catch (err) {
      this._logger.error(`${this.id} failed to send message`, err);
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

        clearTimeout(timer);
        resolve(msg);
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
    const certs = ControlAgent.extractCerts(res.data);
    this._callbackFns?.onCert(certs);

    this._logger.debug('loadCerts is done');
    return certs; // think, if we need to return certs here
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
      const errMessage = `${this.id} WebSocket is not open  [ws.readyState: ${this._ws?.readyState}]`;
      this._logger.warn(errMessage);
      // todo: try to reconnect
      throw new Error(errMessage);
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
