import convict from 'convict';
import { AppConfig } from './infra';

const config = convict<AppConfig>({
  PROXY_ID: {
    doc: 'The Proxy DFSP ID',
    format: String,
    default: null,
    env: 'PROXY_ID',
  },

  peerAConfig: {
    peer: 'A',

    peerEndpoint: {
      doc: 'Base URL on hub A',
      format: String,
      default: null,
      env: 'PEER_ENDPOINT_A',
    },

    authConfig: {
      tokenEndpoint: {
        doc: 'Endpoint to get access token on hub A',
        format: String,
        default: null,
        env: 'OAUTH_TOKEN_ENDPOINT_A',
      },
      clientKey: {
        doc: 'Client key on hub A',
        format: String,
        default: null,
        env: 'OAUTH_CLIENT_KEY_A',
      },
      clientSecret: {
        doc: 'Client secret to get token on hub A',
        format: String,
        default: null,
        sensitive: true,
        env: 'OAUTH_CLIENT_SECRET_A',
      },
      accessTokenUpdateIntervalSec: {
        doc: 'Time interval to update access token on hub A (in seconds)',
        format: Number,
        default: 60,
        env: 'OAUTH_REFRESH_SECONDS_A',
      },
      retryAccessTokenUpdatesTimeoutSec: {
        doc: 'Interval to retry accessToken updates in case of error (in seconds)',
        format: Number,
        default: 5,
        env: 'RETRY_ACCESS_TOKEN_UPDATES_TIMEOUT_SEC',
      },
      retryDnsErrorTimeoutSec: {
        doc: 'Interval to retry DNS errors (in seconds)',
        format: Number,
        default: 5,
        env: 'RETRY_DNS_ERROR_TIMEOUT_SEC',
      },
    },

    controlAgentConfig: {
      wsHost: {
        doc: 'Hostname or IP address where the management API listens for incoming requests',
        format: String,
        default: null,
        env: 'MGMT_API_WS_URL_A',
      },
      wsPort: {
        doc: 'HTTP port to listen on for the management API',
        format: 'port',
        default: null,
        env: 'MGMT_API_WS_PORT_A',
      },
      timeout: {
        doc: 'Timeout for control agent A',
        format: Number,
        default: 5000,
        env: 'MGMT_API_WS_TIMEOUT_A',
      },
      reconnectInterval: {
        doc: 'Reconnect interval for control agent A',
        format: Number,
        default: 5000,
        env: 'MGMT_API_WS_RECONNECT_INTERVAL_A',
      },
    },

    serverConfig: {
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
  },

  peerBConfig: {
    peer: 'B',

    peerEndpoint: {
      doc: 'Base URL on hub B',
      format: String,
      default: null,
      env: 'PEER_ENDPOINT_B',
    },

    authConfig: {
      tokenEndpoint: {
        doc: 'Endpoint to get access token on hub B',
        format: String,
        default: null,
        env: 'OAUTH_TOKEN_ENDPOINT_B',
      },
      clientKey: {
        doc: 'Client key on hub B',
        format: String,
        default: null,
        env: 'OAUTH_CLIENT_KEY_B',
      },
      clientSecret: {
        doc: 'Client secret to get token on hub B',
        format: String,
        default: null,
        sensitive: true,
        env: 'OAUTH_CLIENT_SECRET_B',
      },
      accessTokenUpdateIntervalSec: {
        doc: 'Time interval to update access token on hub B (in seconds)',
        format: Number,
        default: 60,
        env: 'OAUTH_REFRESH_SECONDS_B',
      },
      retryAccessTokenUpdatesTimeoutSec: {
        doc: 'Interval to retry accessToken updates in case of error (in seconds)',
        format: Number,
        default: 5,
        env: 'RETRY_ACCESS_TOKEN_UPDATES_TIMEOUT_SEC',
      },
      retryDnsErrorTimeoutSec: {
        doc: 'Interval to retry DNS errors (in seconds)',
        format: Number,
        default: 5,
        env: 'RETRY_DNS_ERROR_TIMEOUT_SEC',
      },
    },

    controlAgentConfig: {
      wsHost: {
        doc: 'Hostname or IP address where the management API listens for incoming requests',
        format: String,
        default: null,
        env: 'MGMT_API_WS_URL_B',
      },
      wsPort: {
        doc: 'HTTP port to listen on for the management API',
        format: 'port',
        default: null,
        env: 'MGMT_API_WS_PORT_B',
      },
      timeout: {
        doc: 'Timeout for control agent B',
        format: Number,
        default: 5000,
        env: 'MGMT_API_WS_TIMEOUT_B',
      },
      reconnectInterval: {
        doc: 'Reconnect interval for control agent B',
        format: Number,
        default: 5000,
        env: 'MGMT_API_WS_RECONNECT_INTERVAL_B',
      },
    },

    serverConfig: {
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
    default: true,
    env: 'PM4ML_ENABLED',
  },

  incomingHeadersRemoval: {
    doc: 'List of headers to remove from incoming requests before proxying',
    format: Array,
    default: [],
    env: 'INCOMING_HEADERS_REMOVAL',
  },

  checkPeerJwsInterval: {
    doc: 'Interval to check peer JWS changes in milliseconds',
    format: Number,
    default: 1800000, // 30 minutes, this is fail safe mechanism. So the value can be high.
    env: 'CHECK_PEER_JWS_INTERVAL',
  },

  retryStartTimeoutSec: {
    doc: 'Interval to retry start peerServer (in seconds)',
    format: Number,
    default: 60,
    env: 'RETRY_START_TIMEOUT_SEC',
  },

  retryDnsErrorTimeoutSec: {
    doc: 'Interval to retry DNS errors (in seconds)',
    format: Number,
    default: 5,
    env: 'RETRY_DNS_ERROR_TIMEOUT_SEC',
  },
});

config.validate({ allowed: 'strict' });

export default config;
