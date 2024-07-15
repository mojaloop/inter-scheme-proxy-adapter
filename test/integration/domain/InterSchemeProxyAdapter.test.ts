import { InterSchemeProxyAdapter } from '../../../src/domain/InterSchemeProxyAdapter';
import { ISPADeps } from '../../../src/domain/types';
import { ICACerts, ICAPeerJWSCert } from '../../../src/infra';

describe('InterSchemeProxyAdapter', () => {
  let deps: ISPADeps;
  let interSchemeProxyAdapter: InterSchemeProxyAdapter;

  beforeEach(() => {
    deps = {
      ispaService: {
        getProxyTarget: jest.fn(),
      },
      httpRequest: jest.fn(),
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
      },
      httpServerA: {
        start: jest.fn(),
        stop: jest.fn(),
        emit: jest.fn(),
      },
      httpServerB: {
        start: jest.fn(),
        stop: jest.fn(),
        emit: jest.fn(),
      },
      authClientA: {
        stopUpdates: jest.fn(),
      },
      authClientB: {
        stopUpdates: jest.fn(),
      },
    };
    interSchemeProxyAdapter = new InterSchemeProxyAdapter(deps);
  });

  describe('start', () => {
    it('should start ISPA', async () => {
      await interSchemeProxyAdapter.start();

      expect(deps.httpServerA.start).toHaveBeenCalledWith(interSchemeProxyAdapter.handleProxyRequest);
      expect(deps.httpServerB.start).toHaveBeenCalledWith(interSchemeProxyAdapter.handleProxyRequest);
      expect(deps.logger.info).toHaveBeenCalledWith('ISPA is started', { isAStarted: true, isBStarted: true });
    });
  });

  describe('stop', () => {
    it('should stop ISPA', async () => {
      await interSchemeProxyAdapter.stop();

      expect(deps.authClientA.stopUpdates).toHaveBeenCalled();
      expect(deps.authClientB.stopUpdates).toHaveBeenCalled();
      expect(deps.httpServerA.stop).toHaveBeenCalled();
      expect(deps.httpServerB.stop).toHaveBeenCalled();
      expect(deps.logger.info).toHaveBeenCalledWith('ISPA is stopped', { isAStopped: true, isBStopped: true });
    });
  });
});