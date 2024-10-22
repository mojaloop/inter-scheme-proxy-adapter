import { AuthClient } from '#src/infra';
import { logger } from '#src/utils';
import config from '#src/config';

describe('AuthClient Tests -->', () => {
  let authClient: AuthClient;

  beforeEach(() => {
    const { authConfig } = config.get('peerAConfig');
    authClient = new AuthClient({ authConfig, logger });
  });

  test('should return null in case of any network error', async () => {
    authClient['deps'].authConfig.tokenEndpoint = 'http://123-xyz.abcd/token';
    const token = await authClient.getOidcToken();
    expect(token).toBeNull();
  });

  test('should emit empty string as accessToken in case of any error during getOidcToken()', async () => {
    authClient['deps'].authConfig.tokenEndpoint = 'http://098-xyz.abcd/token';
    const emitNewToken = jest.fn();

    await authClient.startAccessTokenUpdates(emitNewToken);
    expect(emitNewToken).toHaveBeenCalledWith('');
    authClient.stopUpdates();
  });
});
