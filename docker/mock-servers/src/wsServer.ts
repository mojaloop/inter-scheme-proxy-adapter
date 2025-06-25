import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { WS_PORT, WS_PING_INTERVAL_MS, clientCerts } from './config';
import { logger } from './utils';

const log = logger.child({ component: 'wsServer' });

class WsWithAlive extends WebSocket {
  isAlive = false;
}

const wss = new WebSocketServer<typeof WsWithAlive>({ port: WS_PORT });
const receivedMessages: unknown[] = [];

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
  log.info('Received test message', msgObj);
  const { verb, data } = msgObj;

  switch (verb) {
    case 'PUBLISH': {
      const msg = JSON.stringify(data);
      log.verbose(`Publishing message: ${msg}`);
      wss.clients.forEach((socket) => socket.send(msg));
      break;
    }
    case 'GET_MESSAGES':
      ws.send(JSON.stringify(receivedMessages));
      break;
    default:
      log.error(`Unknown verb: ${verb}`);
  }
};

wss.on('connection', (ws: WsWithAlive) => {
  log.info('Client connected');
  ws.isAlive = true;

  ws.on('message', (message: string) => {
    receivedMessages.unshift(message);

    const id = `mock-${randomUUID()}`;
    // todo: - check, if we need to extract ID from incoming message
    //       - improve logic to handle different messages
    log.info('Received message: ', { id, message });

    // if this is a test message, handle it and return
    try {
      const msgObj = JSON.parse(message);
      const { msg } = msgObj;

      if (msg === 'TEST') {
        handleTestMessage(msgObj, ws);
        return;
      }
    } catch (err) {
      log.warn('Error parsing message: ', { err, message });
    }

    ws.send(JSON.stringify(credsMessageDto(id)));
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    log.info('Client disconnected');
  });

  ws.on('error', (error: unknown) => {
    log.error('Connection error: ', error);
  });
});

const interval = setInterval(function ping() {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, WS_PING_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(interval);
  log.warn('WSS is closing...');
});
wss.on('error', (err) => {
  log.error('WSS error: ', err);
});

log.info(`Mock men-api server is listening on ws://localhost:${WS_PORT}`);
