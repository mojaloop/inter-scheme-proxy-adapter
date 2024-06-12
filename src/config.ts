import convict from 'convict';
import { AppConfig } from './infra';

const config = convict<AppConfig>({
  PROXY_DFSP_ID: {
    doc: 'The Proxy DFSP ID',
    format: String,
    default: null,
    env: 'PROXY_DFSP_ID',
  },

  mtlsConfig: {
    enabled: {
      doc: 'Defines if mTLS is enabled',
      format: Boolean,
      default: true,
      env: 'MTLS_ENABLED',
    },
    // todo: think, how to make caCertPath, clientCertPath, clientKeyPath NOT required if mTLS is disabled
    caCertPath: {
      doc: 'CA cert file location',
      format: String,
      default: null,
      env: 'MTLS_CA_CERT_PATH',
    },
    clientCertPath: {
      doc: 'Client cert file location',
      format: String,
      default: null,
      env: 'MTLS_CLIENT_CERT_PATH',
    },
    clientKeyPath: {
      doc: 'Client private key file location',
      format: String,
      default: null,
      sensitive: true,
      env: 'MTLS_CLIENT_KEY_PATH',
    },
  },

  serverAConfig: {
    port: {
      doc: 'HTTP port to listen on for serverA',
      format: 'port',
      default: 4100,
      env: 'HTTP_PORT_A',
    },
    host: {
      doc: 'Hostname or IP address where the serverA listens for incoming requests',
      format: String,
      default: '0.0.0.0',
      env: 'HTTP_HOST_A',
    },
  },

  serverBConfig: {
    port: {
      doc: 'HTTP port to listen on for serverB',
      format: 'port',
      default: 4200,
      env: 'HTTP_PORT_B',
    },
    host: {
      doc: 'Hostname or IP address where the serverB listens for incoming requests',
      format: String,
      default: '0.0.0.0',
      env: 'HTTP_HOST_B',
    },
  },

  hubAConfig: {
    baseUrl: {
      doc: 'Base URL on hub A',
      format: String,
      default: null,
      env: 'HUB_A_BASE_URL',
    },
  },

  hubBConfig: {
    baseUrl: {
      doc: 'Base URL on hub B',
      format: String,
      default: null,
      env: 'HUB_B_BASE_URL',
    },
  },

  proxyConfig: {
    // ho2o related
    timeout: {
      doc: 'Number of milliseconds before aborting the upstream request',
      format: Number,
      default: 10_000,
      env: 'PROXY_URI_TIMEOUT',
    },
    passThrough: {
      doc: 'Defines if headers from/to a client to/from upstream service should be forwarded',
      format: Boolean,
      default: true,
      // env: 'PROXY_PASS_THROUGH',
    },
  },

  LOG_LEVEL: {
    doc: 'Logger level',
    format: String, // todo: use LogLevel type
    default: 'info',
    env: 'LOG_LEVEL',
  },
});

config.validate({ allowed: 'strict' });

export default config;
