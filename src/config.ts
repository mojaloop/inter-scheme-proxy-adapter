import convict from 'convict';
import { AppConfig } from './infra';

const config = convict<AppConfig>({
  PROXY_ID: {
    doc: 'The Proxy DFSP ID',
    format: String,
    default: null,
    env: 'PROXY_ID',
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

  mgmtApiAConfig: {
    host: {
      doc: 'Hostname or IP address where the management API listens for incoming requests',
      format: String,
      default: 'localhost',
      env: 'MGMT_API_WS_URL_A',
    },
    port: {
      doc: 'HTTP port to listen on for the management API',
      format: 'port',
      default: 4000,
      env: 'MGMT_API_WS_PORT_A',
    },
  },

  mgmtApiBConfig: {
    host: {
      doc: 'Hostname or IP address where the management API listens for incoming requests',
      format: String,
      default: 'localhost',
      env: 'MGMT_API_WS_URL_B',
    },
    port: {
      doc: 'HTTP port to listen on for the management API',
      format: 'port',
      default: 4000,
      env: 'MGMT_API_WS_PORT_B',
    },
  },

  hubAConfig: {
    baseUrl: {
      doc: 'Base URL on hub A',
      format: String,
      default: null,
      env: 'PEER_ENDPOINT_A',
    },
  },

  hubBConfig: {
    baseUrl: {
      doc: 'Base URL on hub B',
      format: String,
      default: null,
      env: 'PEER_ENDPOINT_B',
    },
  },

  LOG_LEVEL: {
    doc: 'Logger level',
    format: String, // todo: use LogLevel type
    default: 'info',
    env: 'LOG_LEVEL',
  },

  pm4mlEnabled: {
    doc: 'Defines if pm4ml is enabled',
    format: Boolean,
    default: false,
    env: 'PM4ML_ENABLED',
  },
});

config.validate({ allowed: 'strict' });

export default config;
