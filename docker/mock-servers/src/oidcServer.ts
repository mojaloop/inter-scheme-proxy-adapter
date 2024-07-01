import http from 'node:http';
import { randomUUID } from 'node:crypto';
import * as console from 'node:console';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

import { OIDC_PORT } from './config';

const generateOidcTokenDto = ({ expires_in = 300 } = {}) => ({
  access_token: `mock-token-${randomUUID()}`,
  expires_in,
  token_type: 'mock type',
  scope: 'test',
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true });
});

app.post('/openid-connect/token', async (req: Request, res: Response) => {
  // todo: add request validation (headers and payload)
  const input = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
  };
  const token = generateOidcTokenDto();

  console.log('incoming request...', { input, token });
  res.json(token);
});

const httpsServer = http.createServer(app);

httpsServer.listen(OIDC_PORT, () => {
  console.log(`Mock OIDC server is running on port ${OIDC_PORT}...`);
});
