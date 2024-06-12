import https from 'node:https';
import * as console from 'node:console';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

import { MTLS_PORT, DELAY_MS } from './config';
import { readCerds } from './utils';

const tlsOpts = readCerds();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.all('*', async (req: Request, res: Response) => {
  const input = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  console.log('incoming request...', input);
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  res.json(input);
});

const httpsServer = https.createServer(tlsOpts, app);

httpsServer.listen(MTLS_PORT, () => {
  console.log(`express HTTPS Server is running on https://localhost:${MTLS_PORT}`);
});
