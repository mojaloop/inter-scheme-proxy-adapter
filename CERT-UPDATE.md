# Test Certificate Renewal Guide

This document describes how to regenerate the test certificates used in the integration tests when they expire.

## Background

The integration tests use mTLS (mutual TLS) certificates located in `docker/mock-servers/certs/`. These certificates have a limited validity period and need to be renewed periodically.

## Certificate Structure

| Certificate | Purpose | Location |
|-------------|---------|----------|
| CA Certificate | Signs all other certificates | `ca-cert.pem` |
| Server Certificates | Used by mock hub servers (hub-a, hub-b, localhost) | `certs.json` |
| Client Certificates | Used by proxy to connect to hubs | `certs.json` |
| Wrong Certificate | Signed by different CA, used for negative tests | `certs.json` |

## Symptoms of Expired Certificates

Integration tests fail with errors like:
- `"certificate has expired"`
- `Request failed with status code 503`
- `ERR_BAD_RESPONSE`

## Checking Certificate Expiration

To check when certificates expire:

```bash
# Check standalone PEM files
openssl x509 -in docker/mock-servers/certs/ca-cert.pem -noout -dates
openssl x509 -in docker/mock-servers/certs/server-cert.pem -noout -dates

# Check all certificates in certs.json
cat docker/mock-servers/certs/certs.json | python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
for key in data:
    cert = data[key].get('cert', '')
    if cert:
        print(f'=== {key} ===')
        result = subprocess.run(['openssl', 'x509', '-noout', '-dates'],
                                input=cert.encode(), capture_output=True)
        print(result.stdout.decode().strip())
"
```

## Regenerating Certificates

Run the following script from the `docker/mock-servers/certs/` directory:

```bash
#!/bin/bash
set -e

cd docker/mock-servers/certs

# Validity periods (days)
CA_DAYS=1095  # 3 years
CERT_DAYS=730 # 2 years

echo "Generating new CA..."
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days $CA_DAYS \
    -out ca-cert.pem \
    -subj "/C=AU/ST=Some-State/O=CA/CN=localhost"

echo "Generating wrong CA for negative tests..."
openssl genrsa -out wrong-ca-key.pem 2048
openssl req -x509 -new -nodes -key wrong-ca-key.pem -sha256 -days $CA_DAYS \
    -out wrong-ca-cert.pem \
    -subj "/C=AU/ST=Some-State/O=Internet Widgits Pty Ltd/CN=localhost"

# Function to generate server/client certificate
generate_cert() {
    local name=$1
    local cn=$2
    local org=$3
    local ca_key=$4
    local ca_cert=$5

    echo "Generating certificate for $name..."
    openssl genrsa -out "${name}-key.pem" 2048
    openssl req -new -key "${name}-key.pem" -out "${name}.csr" \
        -subj "/C=PT/ST=Porto/O=${org}/CN=${cn}"
    openssl x509 -req -in "${name}.csr" -CA "$ca_cert" -CAkey "$ca_key" \
        -CAcreateserial -out "${name}-cert.pem" -days $CERT_DAYS -sha256
    rm "${name}.csr"
}

# Generate server certificates (signed by main CA)
generate_cert "server-hub-a" "hub-a" "Infitx" "ca-key.pem" "ca-cert.pem"
generate_cert "server-hub-b" "hub-b" "Infitx" "ca-key.pem" "ca-cert.pem"
generate_cert "server-localhost" "localhost" "Internet Widgits Pty Ltd" "ca-key.pem" "ca-cert.pem"

# Generate client certificates (signed by main CA)
generate_cert "client-hub-a" "hub-a" "Infitx" "ca-key.pem" "ca-cert.pem"
generate_cert "client-hub-b" "hub-b" "Infitx" "ca-key.pem" "ca-cert.pem"
generate_cert "client-localhost" "localhost" "Internet Widgits Pty Ltd" "ca-key.pem" "ca-cert.pem"

# Generate 'wrong' certificate (signed by different CA for negative tests)
generate_cert "wrong" "localhost" "Internet Widgits Pty Ltd" "wrong-ca-key.pem" "wrong-ca-cert.pem"

# Update main server-cert.pem and server-key.pem
cp server-localhost-cert.pem server-cert.pem
cp server-localhost-key.pem server-key.pem

echo "Generating certs.json..."
python3 << 'PYTHON'
import json

def read_file(path):
    with open(path, 'r') as f:
        return f.read().strip()

certs = {
    "server-hub-a": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("server-hub-a-cert.pem"),
        "key": read_file("server-hub-a-key.pem")
    },
    "server-hub-b": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("server-hub-b-cert.pem"),
        "key": read_file("server-hub-b-key.pem")
    },
    "server-localhost": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("server-localhost-cert.pem"),
        "key": read_file("server-localhost-key.pem")
    },
    "client-hub-a": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("client-hub-a-cert.pem"),
        "key": read_file("client-hub-a-key.pem")
    },
    "client-hub-b": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("client-hub-b-cert.pem"),
        "key": read_file("client-hub-b-key.pem")
    },
    "client-localhost": {
        "ca": read_file("ca-cert.pem"),
        "cert": read_file("client-localhost-cert.pem"),
        "key": read_file("client-localhost-key.pem")
    },
    "wrong": {
        "ca": read_file("wrong-ca-cert.pem"),
        "cert": read_file("wrong-cert.pem"),
        "key": read_file("wrong-key.pem")
    }
}

with open("certs.json", "w") as f:
    json.dump(certs, f, indent=2)

print("certs.json generated successfully!")
PYTHON

# Clean up intermediate files
rm -f *.srl wrong-ca-key.pem wrong-ca-cert.pem ca-key.pem
rm -f server-hub-a-*.pem server-hub-b-*.pem server-localhost-*.pem
rm -f client-hub-a-*.pem client-hub-b-*.pem client-localhost-*.pem
rm -f wrong-*.pem

echo "Certificate generation complete!"
```

## Verification

After regenerating certificates, verify they are valid:

```bash
# Verify certificate chain
openssl verify -CAfile ca-cert.pem server-cert.pem

# Run unit tests
npm run test:unit

# Run integration tests (requires Docker)
npm run test:int
```

## Certificate Validity Timeline

| Generated | CA Expires | Server/Client Certs Expire |
|-----------|------------|---------------------------|
| Jan 2026  | Jan 2029   | Jan 2028                  |

Set a reminder to regenerate certificates before expiration.
