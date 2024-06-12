// define required env vars
Object.assign(process.env, {
  DFSP_ID: 'proxy1',
  HUB_A_BASE_URL: 'https://localhost:11443',
  HUB_B_BASE_URL: 'https://localhost:22443',

  MTLS_ENABLED: true,
  MTLS_CA_CERT_PATH: 'ca-cert.pem',
  MTLS_CLIENT_CERT_PATH: 'client-cert.pem',
  MTLS_CLIENT_KEY_PATH: 'client-key.pem',
});
