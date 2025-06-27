import { Logger } from '@mojaloop/sdk-standard-components';

export * from './cleanupIncomingHeaders';
export * from './startingProcess';

export const logger = Logger.loggerFactory({ context: 'ISPA' });
