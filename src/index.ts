import config from './config';
import { InterSchemeProxyAdapter } from './domain';
import { createProxyAdapter } from './createProxyAdapter';
import { startingProcess } from './utils';

let proxyAdapter: InterSchemeProxyAdapter;

const start = async () => {
  proxyAdapter = createProxyAdapter(config);
  await proxyAdapter.start();
};

const stop = async () => {
  await proxyAdapter?.stop();
};

startingProcess(start, stop);
