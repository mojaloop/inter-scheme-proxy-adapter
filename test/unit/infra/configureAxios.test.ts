import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { configureAxios } from '#src/infra';
import { logger } from '#src/utils';

const mockAxios = new MockAdapter(axios);

describe('configureAxios Tests -->', () => {
  let axiosInstance: axios.AxiosInstance;

  beforeEach(() => {
    axiosInstance = configureAxios({ logger });
    mockAxios.reset();
  });

  test('should retry if error has retryable statusCode', async () => {
    const url = '/test';
    // prettier-ignore
    mockAxios
      .onGet(url).replyOnce(503)
      .onGet(url).replyOnce(200);
    const response = await axiosInstance({ url });
    expect(response.status).toBe(200);
  });

  test('should fail after several unsuccessful retries', async () => {
    expect.assertions(1);
    const statusCode = 503;
    mockAxios.onGet().reply(statusCode);
    await axiosInstance({ url: '/test' }).catch((err) => {
      expect(err.response.status).toBe(statusCode);
    });
  });
});
