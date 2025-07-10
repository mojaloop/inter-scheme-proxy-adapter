import { Logger, utils } from '@mojaloop/sdk-standard-components';

export * from './startingProcess';

export const { cleanupIncomingHeaders } = utils;

export const logger = Logger.loggerFactory({ context: 'ISPA' });
