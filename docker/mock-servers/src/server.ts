import * as http from 'node:http';
import { URL } from 'node:url';
import process from 'node:process';
import * as console from 'node:console';

import { name } from '../package.json';
import { PORT, DELAY_MS } from './config';

let reqCount = 0;

const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  const reqId = ++reqCount;
  const data: any[] = [];

  req
    .on('data', (chunk) => {
      const chunkStr = chunk.toString();
      console.log('onData:', { chunkStr, data });
      data.push(chunk);
    })
    .on('end', async () => {
      const body = Buffer.concat(data).toString();

      const { method, headers, url } = req;
      const queryParams = Object.fromEntries(new URL(url!, `http://${headers.host}`).searchParams.entries());
      const response = {
        method,
        url,
        body,
        headers,
        queryParams,
      };
      console.log(`[${new Date().toISOString()}][${reqId}] request is ready, waiting...`, { DELAY_MS });
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      console.log(
        `[${new Date().toISOString()}][${reqId}][${method?.toUpperCase()}  ${url}] request processed: `,
        response,
      );
    });
};

const server = http.createServer(requestHandler);

server.listen(PORT, () => {
  console.log(`${name} is listening on port ${PORT}`);
});

['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => {
    console.log(`${name} is stopping due to signal...`, { sig });
    server.close(() => {
      console.log(`${name} has been stopped, exiting the process!`);
      process.exit(0);
    });
  }),
);
