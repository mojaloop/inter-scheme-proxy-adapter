import convict from 'convict';
import { AppConfig } from './infra';

const config = convict<AppConfig>({
  API_SPEC_PATH: {
    doc: 'Path to the OpenAPI spec file',
    format: String,
    default: './src/api-spec/fspiop-rest-v2.0-openapi3-snippets.yaml',
    env: 'API_SPEC_PATH',
  },
  HTTP_PORT: {
    doc: 'HTTP port to listen on',
    format: 'port',
    default: 7000,
    env: 'HTTP_PORT',
  },
  HTTP_HOST: {
    doc: 'Hostname or IP address where the server listens for incoming requests',
    format: String,
    default: '0.0.0.0',
    env: 'HTTP_HOST',
  },

  PROXY_URI: {
    doc: 'The URI to proxy incoming requests to',
    format: String,
    default: null,
    env: 'PROXY_URI',
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
