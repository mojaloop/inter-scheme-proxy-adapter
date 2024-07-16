import * as console from 'node:console';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { WS_PORT, clientCerts } from './config';

const wss = new WebSocketServer({ port: WS_PORT });
const sockets: WebSocket[] = [];
const receivedMessages: any[] = [];

const credsMessageDto = (id: string) => ({
  id,
  verb: 'NOTIFY',
  msg: 'CONFIGURATION',
  data: {
    outbound: {
      tls: {
        creds: { ...clientCerts },
      },
    },
  },
});

const handleTestMessage = (msgObj: any, ws: WebSocket) => {
  const { verb, data } = msgObj;
  console.log('Received test message', msgObj);

  switch (verb) {
    case 'PUBLISH':
      const msg = JSON.stringify(data);
      console.log(`Publishing message: ${msg}`);
      sockets.forEach((socket) => socket.send(msg));
      break;
    case 'GET_MESSAGES':
      ws.send(JSON.stringify(receivedMessages));
      break;
    default:
      console.error(`Unknown verb: ${verb}`);
  }
};

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  sockets.push(ws);

  ws.on('message', (message: string) => {
    receivedMessages.unshift(message);

    const id = `mock-${randomUUID()}`;
    // todo: - check, if we need to extract ID from incoming message
    //       - improve logic to handle different messages
    console.log(`Received message: ${message}`, { id });
    
    // if this is a test message, handle it and return
    try {
      const msgObj = JSON.parse(message);
      const { msg } = msgObj;

      if (msg === 'TEST') {
        handleTestMessage(msgObj, ws)
        return;
      }
    } catch(err) {
      console.warn('Error parsing message: ', { err, message });
    }

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
