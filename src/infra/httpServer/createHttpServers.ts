import { HttpServer, HttpServerDeps } from '../../infra';

export const createHttpServer = (deps: HttpServerDeps) => {
  const { logger, ...restDeps } = deps;

  return new HttpServer({
    ...restDeps,
    logger: logger.child({ component: 'HttpServer' }),
  });
};
