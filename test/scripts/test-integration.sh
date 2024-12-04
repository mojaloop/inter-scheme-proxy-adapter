#!/bin/bash
set -xe

docker load -i /tmp/docker-image.tar
docker-compose up -d
docker-compose ps

echo "waiting for 15sec before tests run..." && sleep 15

npm run test:int

docker-compose down
