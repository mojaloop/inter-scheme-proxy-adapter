import { loggerFactory } from '@mojaloop/central-services-logger/src/contextLogger';

export * from './types';
export * from './startingProcess';

export { loggerFactory };
export const logger = loggerFactory('ISPA');
