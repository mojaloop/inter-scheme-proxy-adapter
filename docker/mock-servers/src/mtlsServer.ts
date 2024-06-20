import https from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as console from 'node:console';

import { name } from '../package.json';
import { MTLS_PORT } from './config';
import { readCerds } from './utils';
// import { requestHandler } from './requestHandler';

const tlsOpts = readCerds();

const server = https.createServer(
  tlsOpts,
  // requestHandler); // todo: with this requestHandler the request is stack
  (req: IncomingMessage, res: ServerResponse) => {
    console.log('incoming request...');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  },
);

server.listen(MTLS_PORT, () => {
  console.log(`${name} (https) is listening on port ${MTLS_PORT}`);
});
