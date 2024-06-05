ARG NODE_VERSION=lts-alpine

# NOTE: Ensure you set NODE_VERSION Build Argument as follows...
#
#  export NODE_VERSION="$(cat .nvmrc)-alpine" \
#  docker build \
#    --build-arg NODE_VERSION=$NODE_VERSION \
#    -t infitx-org/inter-scheme-proxy-adapter:local \
#    . \
#

FROM node:${NODE_VERSION} as builder
#RUN apk add --no-cache git python3 build-base
WORKDIR /opt/app

## Copy basic files for installing dependencies
COPY tsconfig.json package*.json ./
COPY src ./src

RUN npm ci

## Build the app
RUN npm run build

## *Application*
FROM node:${NODE_VERSION}
#RUN apk add --no-cache git python3 g++ make
WORKDIR /opt/app

COPY package*.json ./
RUN npm ci --omit=dev

# Create a non-root user: ml-user
RUN adduser -D ml-user
USER ml-user

## Copy of dist directory from builder
COPY --chown=ml-user --from=builder /opt/app/dist ./dist

## Expose any application ports
# EXPOSE <PORT>

CMD [ "node" , "./dist/index.js" ]
