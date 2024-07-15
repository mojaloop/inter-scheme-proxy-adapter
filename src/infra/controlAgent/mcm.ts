import ws from 'ws';
import * as jsonPatch from 'fast-json-patch';
import stringify from 'fast-safe-stringify';
import { generateSlug } from 'random-word-slugs';
import { ERROR, MESSAGE, VERB } from './constants';
import { GenericObject, ICAPeerJWSCert } from './types';

/**************************************************************************
 * MCM protocol support functions
 *************************************************************************/

export const serialise = stringify;

export const deserialise = (msg: string | ws.RawData) => {
  //reviver function
  return JSON.parse(msg.toString(), (k, v) => {
    if (
      v !== null &&
      typeof v === 'object' &&
      'type' in v &&
      v.type === 'Buffer' &&
      'data' in v &&
      Array.isArray(v.data)
    ) {
      return new Buffer(v.data);
    }
    return v;
  });
};

export const buildMsg = (verb: VERB, msg: MESSAGE, data: jsonPatch.Operation[] | GenericObject | string | ICAPeerJWSCert[], id = generateSlug(4)) =>
  serialise({
    verb,
    msg,
    data,
    id,
  });


export const buildPatchConfiguration = (oldConf: GenericObject, newConf: GenericObject, id: string) => {
  const patches = jsonPatch.compare(oldConf, newConf);
  return buildMsg(VERB.PATCH, MESSAGE.CONFIGURATION, patches, id);
};

/**************************************************************************
 * build
 *
 * Public object exposing an API to build valid protocol messages.
 * It is not the only way to build valid messages within the protocol.
 *************************************************************************/
export const build = {
  CONFIGURATION: {
    PATCH: buildPatchConfiguration,
    READ: (id?: string) => buildMsg(VERB.READ, MESSAGE.CONFIGURATION, {}, id),
    NOTIFY: (config: GenericObject, id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.CONFIGURATION, config, id),
  },
  PEER_JWS: {
    READ: (id?: string) => buildMsg(VERB.READ, MESSAGE.PEER_JWS, {}, id),
    NOTIFY: (peerJWS: ICAPeerJWSCert[], id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.PEER_JWS, peerJWS, id),
  },
  ERROR: {
    NOTIFY: {
      UNSUPPORTED_MESSAGE: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_MESSAGE, id),
      UNSUPPORTED_VERB: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_VERB, id),
      JSON_PARSE_ERROR: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.JSON_PARSE_ERROR, id),
    },
  },
};
