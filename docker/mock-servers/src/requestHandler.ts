import http from 'node:http';
import console from 'node:console';
import { URL } from 'node:url';
import { DELAY_MS } from './config';

let reqCount = 0;

export const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  console.log('incoming request...');
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
    })
    .on('close', () => {
      console.log('request closed');
      res.end(JSON.stringify({ status: 'closed' }));
    })
    .on('error', (err) => {
      console.error('error:', err);
      res.end(JSON.stringify({ status: 'error' }));
    })
    .on('aborted', () => {
      console.error('request aborted');
      res.end(JSON.stringify({ status: 'aborted' }));
    })
    .on('timeout', () => {
      console.error('request timeout');
      res.end(JSON.stringify({ status: 'timeout' }));
    })
    .on('pause', () => {
      console.log('request paused');
    })
    .on('resume', () => {
      console.log('request resume');
    })
    .on('readable', () => {
      console.log('request readable');
    });
};
