import { AuthClient } from '../../src/infra';
import { loggerFactory } from '../../src/utils';
import config from '../../src/config';

type Hubs = 'A' | 'B';
const hub: Hubs = 'A';
const logger = loggerFactory({ hub });

const authClient = new AuthClient({
  authConfig: config.get(`authConfig${hub}`),
  logger,
});

// prettier-ignore
authClient.getOidcToken()
  .catch((err) => logger.error('error on getting token:', err));
