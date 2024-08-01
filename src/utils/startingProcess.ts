import process from 'node:process';
import * as v8 from 'node:v8';

import { logger } from '../utils';
import { SERVICE_NAME } from '../constants';

const SIGNALS = ['SIGINT', 'SIGTERM'];

type AsyncFn = () => Promise<unknown>;

export const startingProcess = (startFn: AsyncFn, stopFn: AsyncFn) => {
  const startTime = Date.now();
  logger.debug(`starting ${SERVICE_NAME}...`, { startTime });

  process.on('uncaughtExceptionMonitor', (err: Error) => {
    logger.error(`uncaughtExceptionMonitor in ${SERVICE_NAME}: ${err?.message}`, err);
    process.exit(2);
  });

  process.on('unhandledRejection', (err: Error) => {
    logger.error(`unhandledRejection in ${SERVICE_NAME}: ${err?.message}`, err);
    process.exit(3);
  });

  SIGNALS.forEach((sig) =>
    process.on(sig, () => {
      logger.info(`${sig}: stopping ${SERVICE_NAME}`, { sig });

      stopFn()
        .then(() => {
          logger.info(`${SERVICE_NAME} was stopped`, { heapStats: v8.getHeapStatistics() });
          process.exit(0);
        })
        .catch((err: Error) => {
          logger.error(`${SERVICE_NAME} was stopped with error: ${err?.message}`);
          process.exit(4);
        });
    }),
  );

  startFn()
    .then((info) => {
      const startDurationSec = (Date.now() - startTime) / 1000;
      logger.info(`${SERVICE_NAME} is started  [start duration, sec: ${startDurationSec.toFixed(1)}]`, {
        info,
        startDurationSec,
        heapStats: v8.getHeapStatistics(),
      });
    })
    .catch((err: Error) => {
      logger.error(`error on ${SERVICE_NAME} start: ${err?.message}`, err);
      process.exit(1);
    });
};
