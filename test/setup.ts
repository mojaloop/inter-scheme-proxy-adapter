// define required env vars
Object.assign(process.env, {
  PROXY_ID: 'proxy1',
  PEER_ENDPOINT_A: 'https://localhost:11443',
  PEER_ENDPOINT_B: 'https://localhost:22443',

  OAUTH_TOKEN_ENDPOINT_A:
    'https://keycloak.dev.devbaremetal.moja-onprem.net/realms/dfsps/protocol/openid-connect/token',
  OAUTH_CLIENT_KEY_A: 'dfsp-jwt',
  OAUTH_CLIENT_SECRET_A: 'secretA',

  OAUTH_TOKEN_ENDPOINT_B:
    'https://keycloak.dev.devbaremetal.moja-onprem.net/realms/dfsps/protocol/openid-connect/token',
  OAUTH_CLIENT_KEY_B: 'dfsp-jwt',
  OAUTH_CLIENT_SECRET_B: 'secretB',

  MGMT_API_WS_URL_A: 'localhost',
  MGMT_API_WS_URL_B: 'localhost',
  MGMT_API_WS_PORT_A: 4000,
  MGMT_API_WS_PORT_B: 4000,
});
