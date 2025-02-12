import { ServerState, HealthcheckDetails } from './types';
import config from './config'; // try to avoid this dependency (pass through deps?)

const { pm4mlEnabled } = config.get();

type ErrorInformation = {
  errorCode: string;
  errorDescription: string;
  extensionList?: {
    extension: { key: string; value: string }[];
  };
};

type ErrorInformationWithStatusCode = {
  status: number;
  data: {
    errorInformation: ErrorInformation;
  };
};

export const errorResponseDto = ({
  status = 500,
  errorCode = '2001',
  errorDescription = 'Internal Server Error',
} = {}): ErrorInformationWithStatusCode =>
  Object.freeze({
    status,
    data: {
      errorInformation: {
        errorCode,
        errorDescription,
      },
    },
  });

export const errorResponsePeerFailedToStartDto = () =>
  errorResponseDto({
    status: 503,
    errorCode: '2003',
    errorDescription: 'Proxy Adapter is temporarily unavailable',
  });

export const serverStateToHealthcheckDetailsDto = (state: ServerState): HealthcheckDetails => {
  if (!pm4mlEnabled) {
    return {
      isReady: true,
    };
  }
  const accessToken = Boolean(state.accessToken);
  const certs = Boolean(state.httpsAgent);
  return Object.freeze({
    accessToken,
    certs,
    isReady: accessToken && certs,
  });
};
