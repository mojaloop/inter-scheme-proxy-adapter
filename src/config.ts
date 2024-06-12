import convict from 'convict';
import { AppConfig } from './infra';

const config = convict<AppConfig>({
  DFSP_ID: {
    doc: 'The Proxy DFSP ID',
    format: String,
    default: null,
    env: 'DFSP_ID',
  },

  mtlsConfigA: {
    enabled: {
      doc: 'Defines if mTLS is enabled on hub A',
      format: Boolean,
      default: true,
      env: 'OUTBOUND_MUTUAL_TLS_ENABLED_A',
    },
    // todo: think, how to make caCertPath, clientCertPath, clientKeyPath NOT required if mTLS is disabled
    caCertPath: {
      doc: 'CA cert file location for hub A',
      format: String,
      default: null,
      env: 'OUT_CA_CERT_PATH_A',
    },
    clientCertPath: {
      doc: 'Client cert file location for hub A',
      format: String,
      default: null,
      env: 'OUT_CLIENT_CERT_PATH_A',
    },
    clientKeyPath: {
      doc: 'Client private key file location for hub A',
      format: String,
      default: null,
      sensitive: true,
      env: 'OUT_CLIENT_KEY_PATH_A',
    },
  },

  mtlsConfigB: {
    enabled: {
      doc: 'Defines if mTLS is enabled on hub B',
      format: Boolean,
      default: true,
      env: 'OUTBOUND_MUTUAL_TLS_ENABLED_B',
    },
    // think, how to make caCertPath, clientCertPath, clientKeyPath NOT required if mTLS is disabled
    caCertPath: {
      doc: 'CA cert file location',
      format: String,
      default: null,
      env: 'OUT_CA_CERT_PATH_B',
    },
    clientCertPath: {
      doc: 'Client cert file location',
      format: String,
      default: null,
      env: 'OUT_CLIENT_CERT_PATH_B',
    },
    clientKeyPath: {
      doc: 'Client private key file location',
      format: String,
      default: null,
      sensitive: true,
      env: 'OUT_CLIENT_KEY_PATH_B',
    },
  },

  serverAConfig: {
    port: {
      doc: 'HTTP port to listen on for serverA',
      format: 'port',
      default: 4100,
      env: 'INBOUND_LISTEN_PORT_A',
    },
    host: {
      doc: 'Hostname or IP address where the serverA listens for incoming requests',
      format: String,
      default: '0.0.0.0',
      env: 'INBOUND_HOST_A',
    },
  },

  serverBConfig: {
    port: {
      doc: 'HTTP port to listen on for serverB',
      format: 'port',
      default: 4200,
      env: 'INBOUND_LISTEN_PORT_B',
    },
    host: {
      doc: 'Hostname or IP address where the serverB listens for incoming requests',
      format: String,
      default: '0.0.0.0',
      env: 'INBOUND_HOST_B',
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

  LOG_LEVEL: {
    doc: 'Logger level',
    format: String, // todo: use LogLevel type
    default: 'info',
    env: 'LOG_LEVEL',
  },
});

config.validate({ allowed: 'strict' });

export default config;
