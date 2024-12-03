#!/bin/bash
set -xe

docker load -i /tmp/docker-image.tar
docker-compose up -d
docker-compose ps

npm run test:int

docker-compose down
