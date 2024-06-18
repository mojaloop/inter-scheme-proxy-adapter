import * as console from 'node:console';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

import certs from '../certs/certs.json';
import { WS_PORT } from './config';

const wss = new WebSocketServer({ port: WS_PORT });

let CERTS = { ...certs.client };
// todo: add possibility to change certs

const credsMessageDto = (id: string) => ({
  id,
  verb: 'NOTIFY',
  msg: 'CONFIGURATION',
  data: {
    outbound: {
      tls: {
        creds: CERTS,
      },
    },
  },
});

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', (message: string) => {
    const id = `mock-${randomUUID()}`;
    // todo: - check, if we need to extract ID from incoming message
    //       - improve logic to handle different messages
    console.log(`Received message: ${message}`, { id });
    ws.send(JSON.stringify(credsMessageDto(id)));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error: any) => {
    console.error(`Connection error: ${error.message}`);
  });
});

console.log(`Mock men-api server is listening on ws://localhost:${WS_PORT}`);
