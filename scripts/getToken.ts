import { AuthClient } from '../src/infra';
import { loggerFactory } from '../src/utils';
import config from '../src/config';

const authClient = new AuthClient({
  authConfig: config.get('authConfigA'),
  logger: loggerFactory(),
});

authClient.getOidcToken().catch(console.error);
