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
import { GenericObject, ICACallbacks, ICAParams, ICACerts, IControlAgent } from './types';
import { ILogger } from '#src/domain';
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
  private ws: WebSocket | null = null;
  private id: string;
  private logger: ILogger;
  private address: string;
  private port: number;
  private callbackFns: ICACallbacks | null = null;

  constructor(params: ICAParams) {
    this.id = params.id || 'ControlAgent';
    this.address = params.address || 'localhost';
    this.port = params.port;
    this.logger = params.logger;
  }

  init (cbs: ICACallbacks){
    this.callbackFns = cbs;
    return this.open();
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.port ? `${this.address}:${this.port}` : this.address;
      const protocol = this.address.includes('://') ? '' : 'ws://';
      
      this.ws = new WebSocket(`${protocol}${url}`);

      this.ws.on('open', () => {
        this.logger.info(`${this.id} websocket connected`);
        resolve();
      });
      this.ws.on('error', reject);
      this.ws.on('message', this._handle);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info(`${this.id} shutting down...`);

      if (!this.ws) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      this.ws.on('close', resolve);
      this.ws.on('error', reject);

      this.ws.close();
    });
  }

  send(msg: string | GenericObject) {
    const data = typeof msg === 'string' ? msg : serialise(msg);
    this.logger.debug(`${this.id} sending message`, { data });
    return new Promise((resolve) => this.ws?.send(data, resolve));
  }

  // Receive a single message
  receive(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      this.ws.once('message', (data) => {
        const msg = deserialise(data);
        this.logger.debug('Received', { msg });
        resolve(msg);
      });
    });
  }

  private extractCerts(data: GenericObject): ICACerts {
    // todo: need to align with actual message format from mcm
    return {
      cert: data.cert,
      key: data.key,
      ca: data.ca,
    } as ICACerts;
  }

  private _handle(data: ws.RawData | string) {
    let msg;
    try {
      msg = deserialise(data);
      this.logger.debug(`${this.id} received `, { msg });
    } catch (err) {
      this.logger.error(`${this.id} couldn't parse received message`, { data });
      this.send(build.ERROR.NOTIFY.JSON_PARSE_ERROR());
    }
    this.logger.debug(`${this.id} handling received message`, { msg });
    switch (msg.msg) {
      case MESSAGE.CONFIGURATION:
        switch (msg.verb) {
          case VERB.NOTIFY: 
          case VERB.PATCH:
          {
            this.callbackFns?.onCert(this.extractCerts(msg.data));
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