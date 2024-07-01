/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

  Steven Oderayi <steven.oderayi@infitx.com>
 **********/

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

  constructor(params: ICAParams) {
    this._id = params.id || 'ControlAgent';
    this._address = params.address || 'localhost';
    this._port = params.port;
    this._logger = params.logger;
    this._timeout = params.timeout;
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
      this._ws.on('error', reject);
      this._ws.on('message', this._handle.bind(this));
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._logger.info(`${this.id} shutting down...`);

      this._checkSocketState();

      this._ws?.on('close', resolve);
      this._ws?.on('error', reject);

      this._ws?.close();
    });
  }

  send(msg: string | GenericObject) {
    this._checkSocketState();

    const data = typeof msg === 'string' ? msg : serialise(msg);
    this._logger.debug(`${this.id} sending message`, { data });

    this._ws?.send(data);
  }

  // Receive a single message
  receive(): Promise<WsPayload> {
    return new Promise((resolve, reject) => {
      this._checkSocketState();

      const timer = setTimeout(() => {
        reject(new Error(`${this.id} timed out waiting for message`));
      }, this._timeout);

      this._ws?.once('message', (data) => {
        const msg = deserialise(data);
        this._logger.verbose('Received', { msg });
        const isValid = isWsPayload(msg);
        if (!isValid) {
          reject(new TypeError('Invalid WS response format'));
        } else {
          resolve(msg);
        }
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

  static extractCerts(data: IMCMCertData): ICACerts {
    // current implementation is for the initial certs load
    return data.outbound.tls.creds;
    // todo: think, if it's make sense to add isCertsPayload here
  }

  private _checkSocketState() {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error(`${this.id} WebSocket is not open`);
    }
  }

  private _handle(data: ws.RawData | string) {
    let msg;
    try {
      msg = deserialise(data);
      this._logger.debug(`${this.id} received `, { msg });
    } catch (err) {
      this._logger.error(`${this.id} couldn't parse received message`, { data });
      this.send(build.ERROR.NOTIFY.JSON_PARSE_ERROR());
    }
    this._logger.debug(`${this.id} handling received message`, { msg });
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
      default:
        this.send(build.ERROR.NOTIFY.UNSUPPORTED_MESSAGE(msg.id));
        break;
    }
  }
}