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

 * Steven Oderayi <steven.oderayi@infitx.com>
 --------------
 **********/

import ws from 'ws';
import * as jsonPatch from 'fast-json-patch';
import { generateSlug } from 'random-word-slugs';
import _ from 'lodash';

import { ERROR, EVENT, MESSAGE, VERB } from './constants';
import { GenericObject } from './types';
import { ILogger } from '#src/domain';
import { AppConfig } from '#src/infra';

/**************************************************************************
 * Private convenience functions
 *************************************************************************/
const serialise = JSON.stringify;
const deserialise = (msg: string | ws.RawData) => {
  //reviver function
  return JSON.parse(msg.toString(), (k, v) => {
    if (
      v !== null &&
      typeof v === 'object' &&
      'type' in v &&
      v.type === 'Buffer' &&
      'data' in v &&
      Array.isArray(v.data)
    ) {
      return new Buffer(v.data);
    }
    return v;
  });
};

const buildMsg = (verb: VERB, msg: MESSAGE, data: jsonPatch.Operation[] | GenericObject | string, id = generateSlug(4)) =>
  serialise({
    verb,
    msg,
    data,
    id,
  });

const buildPatchConfiguration = (oldConf: GenericObject, newConf: GenericObject, id: string) => {
  const patches = jsonPatch.compare(oldConf, newConf);
  return buildMsg(VERB.PATCH, MESSAGE.CONFIGURATION, patches, id);
};

/**************************************************************************
 * build
 *
 * Public object exposing an API to build valid protocol messages.
 * It is not the only way to build valid messages within the protocol.
 *************************************************************************/
export const build = {
  CONFIGURATION: {
    PATCH: buildPatchConfiguration,
    READ: (id?: string) => buildMsg(VERB.READ, MESSAGE.CONFIGURATION, {}, id),
    NOTIFY: (config: GenericObject, id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.CONFIGURATION, config, id),
  },
  ERROR: {
    NOTIFY: {
      UNSUPPORTED_MESSAGE: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_MESSAGE, id),
      UNSUPPORTED_VERB: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_VERB, id),
      JSON_PARSE_ERROR: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.JSON_PARSE_ERROR, id),
    },
  },
};

/**************************************************************************
 * IClientParams
 *
 * Interface for the parameters required to create a new Client instance
 *
 * address   - address of control server
 * port      - port of control server
 * logger    - Logger- see SDK logger used elsewhere
 * appConfig - the application configuration
 *************************************************************************/
export interface IClientParams { 
  address?: string;
  port: number;
  logger: ILogger;
  appConfig: AppConfig;
}

/**************************************************************************
 * Client
 *
 * The Control Client. Client for the websocket control API.
 * Used to hot-restart the SDK.
 *
 * logger    - Logger- see SDK logger used elsewhere
 * address   - address of control server
 * port      - port of control server
 *************************************************************************/
export class Client extends ws {
  private _logger: ILogger;
  private _appConfig: GenericObject;
  /**
   * Consider this a private constructor.
   * `Client` instances outside of this class should be created via the `Create(...args)` static method.
   */
  constructor({ address = 'localhost', port, logger, appConfig }: IClientParams ) {
    super(`ws://${address}:${port}`);
    this._logger = logger;
    this._appConfig = appConfig;
  }

  // Really only exposed so that a user can import only the client for convenience
  get Build() {
    return build;
  }

  static Create(args: IClientParams) {
    return new Promise((resolve, reject) => {
      const client = new Client(args);
      client.on('open', () => resolve(client));
      client.on('error', (err) => reject(err));
      client.on('message', client._handle);
    });
  }

  async sendMsg(msg: string | GenericObject) {
    const data = typeof msg === 'string' ? msg : serialise(msg);
    this._logger.debug('Sending message', { data });
    return new Promise((resolve) => super.send.call(this, data, {}, resolve));
  }

  // Receive a single message
  async receive() {
    return new Promise((resolve) =>
      this.once('message', (data) => {
        const msg = deserialise(data);
        this._logger.debug('Received', { msg });
        resolve(msg);
      }),
    );
  }

  // Close connection
  async stop() {
    this._logger.info('Control client shutting down...');
    this.close();
  }

  // Handle incoming message from the server.
  _handle(data: ws.RawData | string) {
    // TODO: json-schema validation of received message- should be pretty straight-forward
    // and will allow better documentation of the API
    let msg;
    try {
      msg = deserialise(data);
    } catch (err) {
      this._logger.error('Couldn\'t parse received message', { data });
      this.send(build.ERROR.NOTIFY.JSON_PARSE_ERROR());
    }
    this._logger.debug('Handling received message', { msg });
    switch (msg.msg) {
      case MESSAGE.CONFIGURATION:
        switch (msg.verb) {
          case VERB.NOTIFY: {
            const dup = JSON.parse(JSON.stringify(this._appConfig)); // fast-json-patch explicitly mutates
            _.merge(dup, msg.data);
            this._logger.debug('Emitting new configuration', { oldConf: this._appConfig, newConf: dup });
            this.emit(EVENT.RECONFIGURE, dup);
            break;
          }
          case VERB.PATCH: {
            const dup = JSON.parse(JSON.stringify(this._appConfig)); // fast-json-patch explicitly mutates
            jsonPatch.applyPatch(dup, msg.data);
            this._logger.debug('Emitting new configuration', { oldConf: this._appConfig, newConf: dup });
            this.emit(EVENT.RECONFIGURE, dup);
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