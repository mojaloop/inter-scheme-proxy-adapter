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

 --------------
 ******/

// import OpenAPIBackend from 'openapi-backend';
import Hapi from '@hapi/hapi';
import h2o2 from '@hapi/h2o2';
// import Wreck from '@hapi/wreck';

import config from './config';
import { loggingPlugin } from './plugins';
import { startingProcess, loggerFactory } from './utils';

const logger = loggerFactory('ISPA');
const plugins = [
  {
    plugin: loggingPlugin,
    options: { logger },
  },
  h2o2,
];
// add other plugins here

const start = async () => {
  const server = new Hapi.Server({
    host: config.get('HTTP_HOST'),
    port: config.get('HTTP_PORT'),
  });
  await server.register(plugins);

  const proxyConfig = {
    uri: `${config.get('PROXY_URI')}{path}{query}`,
    passThrough: true,
    timeout: 30_000,
  };

  // const api = new OpenAPIBackend({
  //   definition: config.get('API_SPEC_PATH'),
  //   strict: true,
  //   handlers: {
  //     validationFail: async (context, req: Hapi.Request, h: Hapi.ResponseToolkit) =>
  //       h.response({ err: context.validation.errors }).code(400),
  //     notFound: async (context, req: Hapi.Request, h: Hapi.ResponseToolkit) =>
  //       h.response({ err: 'Not found' }).code(404),
  //     notImplemented: async (c, req: Hapi.Request, h: Hapi.ResponseToolkit) => {
  //       // req.payload = c.request.body;
  //       logger.debug('validation passed, proxying...', req.payload);
  //       return h.proxy(proxyConfig);
  //     },
  //   },
  // });

  // await api.init();

  // use as a catch-all handler
  server.route([
    // {
    //   method: '*',
    //   path: '/{path*}',
    //   handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    //     const { method, path, query, headers } = request;
    //     const body = await Wreck.read(request.raw.req, { json: true });
    //     const req = {
    //       method,
    //       path,
    //       body,
    //       query,
    //       headers,
    //     };
    //     logger.info('parsed request: ', req);
    //     logger.info('Hapi payload request: ', request.payload);
    //     return api.handleRequest(req, request, h);
    //   },
    //   options: {
    //     payload: {
    //       // Cannot proxy if payload is parsed or if output is not stream or data
    //       output: 'stream',
    //       parse: false,
    //     },
    //   },
    // },
    {
      method: '*',
      path: '/{path*}', // '/proxy',
      handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
        logger.verbose('proxying request: ', request.payload);
        return h.proxy(proxyConfig);
      },
      options: {
        payload: {
          // Cannot proxy if payload is parsed or if output is not stream or data
          output: 'stream',
          parse: false,
        },
      },
    },
  ]);
  await server.start();

  logger.info('server is running on', server.info);
};

const stop = async () => {};

startingProcess(start, stop, logger);
