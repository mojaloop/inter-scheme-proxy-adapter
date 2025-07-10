import https from 'node:https';
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';

import { MTLS_PORT, DELAY_MS, HUB_HEADERS } from './config';
import { createTlsServerOptions, logger } from './utils';

const log = logger.child({ component: 'hubServer' });

const tlsOpts = createTlsServerOptions();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true });
});

app.put('/ping/:id', (req: Request, res: Response) => {
  const { body, params } = req;
  log.info('ping request:', { body, params });
  res.status(200).end();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  // todo: improve auth validation (jwt-token)
  if (!authorization?.startsWith('Bearer ')) {
    const error = 'Authorization Error';
    log.warn(error, authorization);
    res.status(401).json({ error });
  } else {
    next();
  }
});

app.all('*', async (req: Request, res: Response) => {
  const input = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  log.info('incoming request...', input);
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  res.set(HUB_HEADERS).json(input);
});

const httpsServer = https.createServer(tlsOpts, app);

httpsServer.listen(MTLS_PORT, () => {
  log.info(`Mock HTTPS hub-server is running on https://localhost:${MTLS_PORT}`);
});
