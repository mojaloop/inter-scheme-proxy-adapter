// define required env vars
Object.assign(process.env, {
  DFSP_ID: 'proxy1',
  HUB_A_BASE_URL: 'https://localhost:11443',
  HUB_B_BASE_URL: 'https://localhost:22443',

  OUTBOUND_MUTUAL_TLS_ENABLED_A: true,
  OUT_CA_CERT_PATH_A: 'ca-cert.pem',
  OUT_CLIENT_CERT_PATH_A: 'client-cert.pem',
  OUT_CLIENT_KEY_PATH_A: 'client-key.pem',

  OUTBOUND_MUTUAL_TLS_ENABLED_B: true,
  OUT_CA_CERT_PATH_B: 'ca-cert.pem',
  OUT_CLIENT_CERT_PATH_B: 'client-cert.pem',
  OUT_CLIENT_KEY_PATH_B: 'client-key.pem',
});
