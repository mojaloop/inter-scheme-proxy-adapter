import { IMCMCertData } from './types';

/*************************************************************************
 * The management-api message protocol messages, verbs, and errors
 *************************************************************************/
export enum MESSAGE {
  CONFIGURATION = 'CONFIGURATION',
  ERROR = 'ERROR',
}

export enum VERB {
  READ = 'READ',
  NOTIFY = 'NOTIFY',
  PATCH = 'PATCH',
}

export enum ERROR {
  UNSUPPORTED_MESSAGE = 'UNSUPPORTED_MESSAGE',
  UNSUPPORTED_VERB = 'UNSUPPORTED_VERB',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
}

/**************************************************************************
 * Events emitted by the control agent
 *************************************************************************/
export enum EVENT {
  RECONFIGURE = 'RECONFIGURE',
}
