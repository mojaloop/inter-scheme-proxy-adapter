import { PeerLabel } from '../../src/domain';
import { AuthClient } from '../../src/infra';
import { loggerFactory } from '../../src/utils';
import config from '../../src/config';

const hub: PeerLabel = 'A';
const logger = loggerFactory({ hub });

const authClient = new AuthClient({
  authConfig: config.get(`peer${hub}Config.authConfig`),
  logger,
});

// prettier-ignore
authClient.getOidcToken()
  .catch((err) => logger.error('error on getting token:', err));
