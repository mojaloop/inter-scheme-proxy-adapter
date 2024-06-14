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
import { MESSAGE, VERB } from './constants';
import { GenericObject, ICACallbacks, ICAParams, ICACerts, IControlAgent, IMCMCertData } from './types';
import { ILogger } from '../../domain';
import { build, deserialise, serialise } from './mcm';

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

  constructor(params: ICAParams) {
    this._id = params.id || 'ControlAgent';
    this._address = params.address || 'localhost';
    this._port = params.port;
    this._logger = params.logger;
    this.receive = this.receive.bind(this);
  }

  get id() {
    return this._id;
  }

  init(cbs: ICACallbacks) {
    this._callbackFns = cbs;
    return this.open();
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this._port ? `${this._address}:${this._port}` : this._address;
      const protocol = this._address.includes('://') ? '' : 'ws://';

      this._ws = new WebSocket(`${protocol}${url}`);

      this._ws.on('open', () => {
        this._logger.info(`${this.id} websocket connected`);
        resolve();
      });
      this._ws.on('error', reject);
      this._ws.on('message', this._handle.bind(this));
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._logger.info(`${this.id} shutting down...`);

      if (!this._ws) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      this._ws.on('close', resolve);
      this._ws.on('error', reject);

      this._ws.close();
    });
  }

  get build() {
    return build;
  }

  send(msg: string | GenericObject) {
    const data = typeof msg === 'string' ? msg : serialise(msg);
    this._logger.debug(`${this.id} sending message`, { data });
    return new Promise((resolve) => this._ws?.send(data, resolve));
  }

  // Receive a single message
  receive(): Promise<GenericObject> {
    return new Promise((resolve, reject) => {
      if (!this._ws) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      this._ws.once('message', (data) => {
        const msg = deserialise(data);
        this._logger.debug('Received', { msg });
        resolve(msg);
      });
    });
  }

  static extractCerts(data: IMCMCertData | unknown): ICACerts {
    // todo: figure out the shape of the realtime data when the control agent receives config changes message for certs
    // current implementation is for the initial certs load
    return (data as IMCMCertData).outbound?.tls?.creds as ICACerts;
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
            const certs = ControlAgent.extractCerts(msg.data);
            certs && this._callbackFns?.onCert(certs);
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
