# inter-scheme-proxy-adapter  (ISPA)


A `inter-scheme-proxy-adapter  (ISPA)` project is Schemes Proxy Implementation.

Design is [here](https://github.com/infitx-org/uml_diagrams/blob/main/Proxy/Readme.md)

### Install dependencies

```bash
npm install
```

## Build

Command to transpile Typescript into JS:

```bash
npm run build
```

## Run

```bash
npm start
```

## Tests

```bash
npm test
```


## Testing proxy JWS functionality

- Run backend dependencies by executing `docker compose up -d` from `/test/func` directory
- Wait for all containers to be healthy
- Run following commands from `connection manager-api` repo in a new terminal
  ```
  DOTENV_CONFIG_PATH=`pwd`/server_a_IGNORE.env npx knex --knexfile src/knexfile.js migrate:latest
  DOTENV_CONFIG_PATH=`pwd`/server_a_IGNORE.env npx knex --knexfile src/knexfile.js seed:run
  DOTENV_CONFIG_PATH=`pwd`/server_a_IGNORE.env npm run start:dev
  ```
- Run following commands from `connection manager-api` repo in a new terminal
  ```
  DOTENV_CONFIG_PATH=`pwd`/server_b_IGNORE.env npx knex --knexfile src/knexfile.js migrate:latest
  DOTENV_CONFIG_PATH=`pwd`/server_b_IGNORE.env npx knex --knexfile src/knexfile.js seed:run
  DOTENV_CONFIG_PATH=`pwd`/server_b_IGNORE.env npm run start:dev
  ```
- Run following commands from `mojaloop-payment-manager-management-api` repo in a new terminal
  ```
  DOTENV_CONFIG_PATH=./client_a_IGNORE.env npm run start:dev
  ```
- Run following commands from `mojaloop-payment-manager-management-api` repo in a new terminal
  ```
  DOTENV_CONFIG_PATH=./client_b_IGNORE.env npm run start:dev
  ```
- Run `npm run start:dev` from `ISPA` repo in a new terminal

- Create two new DFSPs (DFSPA1, DFSPA2) in connection manager A using `POST http://localhost:13001/dfsps`
- Publish a JWS public key for DFSPA1 using `POST http://localhost:13001/dfsps/DFSPA1/jwsKeys`
- The ISPA service should get a notification("verb":"NOTIFY","msg":"PEER_JWS") for the new JWS public key
- Publish another JWS public key for DFSPA2 using `POST http://localhost:13001/dfsps/DFSPA2/jwsKeys`
- The ISPA service should get another notification("verb":"NOTIFY","msg":"PEER_JWS") including both the keys