import {
  AppSystemProp,
  QueueMode,
  localFileStore,
  system,
} from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  isNil,
  spreadIfDefined,
} from '@openops/shared';
import { randomBytes } from 'crypto';
import jwtLibrary, {
  DecodeOptions,
  SignOptions,
  VerifyOptions,
} from 'jsonwebtoken';
import { promisify } from 'util';

export enum JwtSignAlgorithm {
  HS256 = 'HS256',
  RS256 = 'RS256',
}

const ONE_WEEK = 7 * 24 * 3600;
const KEY_ID = '1';
const ISSUER = 'OpenOps';
const ALGORITHM = JwtSignAlgorithm.HS256;

let secret: string | null = null;
const queueMode = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE);

const getSecret = async (): Promise<string> => {
  if (secret !== null) {
    return secret;
  }
  secret = system.get(AppSystemProp.JWT_SECRET) ?? null;

  if (queueMode === QueueMode.MEMORY) {
    if (isNil(secret)) {
      secret = await getSecretFromStore();
    }
    if (isNil(secret)) {
      secret = await generateAndStoreSecret();
    }
  }
  if (isNil(secret)) {
    throw new ApplicationError(
      {
        code: ErrorCode.SYSTEM_PROP_INVALID,
        params: {
          prop: AppSystemProp.JWT_SECRET,
        },
      },
      `System property OPS_${AppSystemProp.JWT_SECRET} must be defined`,
    );
  }
  return secret;
};

const getSecretFromStore = async (): Promise<string | null> => {
  return localFileStore.load(AppSystemProp.JWT_SECRET);
};

const generateAndStoreSecret = async (): Promise<string> => {
  const secretLengthInBytes = 32;
  const secretBuffer = await promisify(randomBytes)(secretLengthInBytes);
  const secret = secretBuffer.toString('base64');
  await localFileStore.save(AppSystemProp.JWT_SECRET, secret);
  return secret;
};

export const jwtUtils = {
  async sign({
    payload,
    key,
    expiresInSeconds = ONE_WEEK,
    keyId = KEY_ID,
    algorithm = ALGORITHM,
  }: SignParams): Promise<string> {
    const signOptions: SignOptions = {
      algorithm,
      keyid: keyId,
      expiresIn: expiresInSeconds,
      issuer: ISSUER,
    };
    return new Promise((resolve, reject) => {
      jwtLibrary.sign(payload, key, signOptions, (err, token) => {
        if (err) {
          return reject(err);
        }

        if (isNil(token)) {
          return reject(
            new ApplicationError({
              code: ErrorCode.INVALID_BEARER_TOKEN,
              params: {},
            }),
          );
        }

        return resolve(token);
      });
    });
  },
  getJwtSecret: getSecret,
  async decodeAndVerify<T>({
    jwt,
    key,
    algorithm = ALGORITHM,
    issuer = ISSUER,
    audience,
  }: VerifyParams): Promise<T> {
    const verifyOptions: VerifyOptions = {
      algorithms: [algorithm],
      ...spreadIfDefined('issuer', issuer),
      ...spreadIfDefined('audience', audience),
    };

    return new Promise((resolve, reject) => {
      jwtLibrary.verify(jwt, key, verifyOptions, (err, payload) => {
        if (err) {
          return reject(err);
        }
        return resolve(payload as T);
      });
    });
  },

  decode<T>({ jwt }: DecodeParams): DecodedJwt<T> {
    const decodeOptions: DecodeOptions = {
      complete: true,
    };

    return jwtLibrary.decode(jwt, decodeOptions) as DecodedJwt<T>;
  },
};

type SignParams = {
  payload: Record<string, unknown>;
  key: string;
  expiresInSeconds?: number;
  algorithm?: JwtSignAlgorithm;
  keyId?: string;
};

type VerifyParams = {
  jwt: string;
  key: string;
  algorithm?: JwtSignAlgorithm;
  issuer?: string | string[] | null;
  audience?: string;
};

type DecodeParams = {
  jwt: string;
};

type DecodedJwt<T> = {
  header: {
    alg: string;
    typ: string;
    kid: string;
  };
  payload: T;
  signature: string;
};
