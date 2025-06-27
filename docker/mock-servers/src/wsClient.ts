import * as console from 'node:console';
import { WebSocket } from 'ws';
import { WS_PORT } from './config';

const address = `ws://localhost:${WS_PORT}`;
const ws = new WebSocket(address);

ws.on('open', () => {
  console.log('Connected to the server', { address });
  ws.send('Hello, Server!');
});

ws.on('message', (message: string) => {
  console.log('Received message', message.toString());
});

ws.on('close', () => {
  console.log('Disconnected from the server');
});

ws.on('error', (error) => {
  console.error(`Connection error: ${error.message}`, error);
});
