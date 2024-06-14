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

import config from './config';
import { InterSchemeProxyAdapter, ISPAService } from './domain';
import { AuthClient, createControlAgents, createHttpServers, httpRequest } from './infra';
import { loggerFactory, startingProcess } from './utils';

let proxyAdapter: InterSchemeProxyAdapter;

const start = async () => {
  const { PROXY_ID, authConfigA, authConfigB } = config.get();
  const logger = loggerFactory(`ISPA-${PROXY_ID}`);
  const { httpServerA, httpServerB } = await createHttpServers({ logger });
  const { controlAgentA, controlAgentB } = await createControlAgents({ logger });

  const authClientA = new AuthClient({ logger, authConfig: authConfigB });
  const authClientB = new AuthClient({ logger, authConfig: authConfigA });
  const ispaService = new ISPAService({ logger });

  proxyAdapter = new InterSchemeProxyAdapter({
    ispaService,
    authClientA,
    authClientB,
    httpServerA,
    httpServerB,
    controlAgentA,
    controlAgentB,
    httpRequest,
    logger,
  });
  await proxyAdapter.start();
};

const stop = async () => {
  await proxyAdapter?.stop();
};

startingProcess(start, stop);
