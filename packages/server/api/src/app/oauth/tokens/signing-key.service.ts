import { encryptUtils, logger } from '@openops/server-shared';
import { EncryptedObject, openOpsId } from '@openops/shared';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { repoFactory } from '../../core/db/repo-factory';
import { invalidGrant, serverError } from '../common/oauth-errors';
import { oauthConfig } from '../config/oauth-config';
import { OAuthSigningKey } from '../storage/oauth-model';
import { OAuthSigningKeyEntity } from '../storage/oauth.entity';

const repo = repoFactory<OAuthSigningKey>(OAuthSigningKeyEntity);

const ALGORITHM = 'RS256';
const MODULUS_LENGTH = 2048;
const UNIQUE_VIOLATION = '23505';
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;
const OPERATOR_KEY_ID_LENGTH = 16;

type LoadedKeys = {
  signing: { kid: string; privateKeyPem: string };
  /** Active plus retiring: every key a token may legitimately have been signed with. */
  verification: Map<string, string>;
  loadedAt: number;
};

let cachedKeys: LoadedKeys | undefined;

function toPublicKeyPem(privateKeyPem: string): string {
  return crypto
    .createPublicKey(privateKeyPem)
    .export({ type: 'spki', format: 'pem' }) as string;
}

function loadOperatorProvidedKey(pemPath: string): LoadedKeys {
  const privateKeyPem = fs.readFileSync(pemPath, 'utf-8');
  const publicKeyPem = toPublicKeyPem(privateKeyPem);
  const kid = crypto
    .createHash('sha256')
    .update(publicKeyPem)
    .digest('hex')
    .slice(0, OPERATOR_KEY_ID_LENGTH);

  return {
    signing: { kid, privateKeyPem },
    verification: new Map([[kid, publicKeyPem]]),
    loadedAt: Date.now(),
  };
}

async function loadKeysFromDatabase(): Promise<LoadedKeys> {
  const keys = await repo().find();
  const activeKey = keys.find((key) => key.status === 'active');

  if (!activeKey) {
    throw serverError('OAuth signing key is not initialized');
  }

  const verification = new Map(
    keys
      .filter((key) => key.status !== 'retired')
      .map((key) => [key.id, key.publicKeyPem]),
  );

  const privateKeyPem = encryptUtils.decryptString(
    JSON.parse(activeKey.privateKeyEncrypted) as EncryptedObject,
  );

  return {
    signing: { kid: activeKey.id, privateKeyPem },
    verification,
    loadedAt: Date.now(),
  };
}

async function loadKeys(): Promise<LoadedKeys> {
  if (cachedKeys && Date.now() - cachedKeys.loadedAt < KEY_CACHE_TTL_MS) {
    return cachedKeys;
  }

  const pemPath = oauthConfig.getSigningKeyPemPath();

  try {
    cachedKeys = pemPath
      ? loadOperatorProvidedKey(pemPath)
      : await loadKeysFromDatabase();
  } catch (error) {
    // Keys change only on rotation, so a stale copy is still correct: serving it through
    // a database outage keeps already-issued tokens verifiable instead of telling every
    // connected agent its credential is invalid.
    if (!cachedKeys) {
      throw error;
    }

    logger.warn('Reusing cached OAuth signing keys after a failed reload', {
      error,
    });
    cachedKeys.loadedAt = Date.now();
  }

  return cachedKeys;
}

export const signingKeyService = {
  /**
   * Generates the keypair on first boot so a self-hosted install needs no key
   * configuration. Concurrent replicas race on the partial unique index over
   * `status = 'active'`; the loser reuses the winner's key.
   */
  async ensureSigningKey(): Promise<void> {
    if (oauthConfig.getSigningKeyPemPath()) {
      return;
    }

    const existingKey = await repo().findOneBy({ status: 'active' });
    if (existingKey) {
      return;
    }

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: MODULUS_LENGTH,
    });
    const privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;
    const publicKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;
    const now = new Date().toISOString();

    try {
      await repo().insert({
        id: openOpsId(),
        created: now,
        updated: now,
        privateKeyEncrypted: JSON.stringify(
          encryptUtils.encryptString(privateKeyPem),
        ),
        publicKeyPem,
        status: 'active',
      });
      logger.info('OAuth signing key generated');
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      logger.info('OAuth signing key already created by another instance');
    }
  },

  async getJwks(): Promise<{ keys: Record<string, unknown>[] }> {
    const keys = await loadKeys();

    return {
      keys: [...keys.verification.entries()].map(([kid, publicKeyPem]) => ({
        ...(crypto
          .createPublicKey(publicKeyPem)
          .export({ format: 'jwk' }) as Record<string, unknown>),
        kid,
        alg: ALGORITHM,
        use: 'sig',
      })),
    };
  },

  // `project_id` is signed rather than looked up per request, so a token can only ever
  // act on the project it was minted for.
  async signAccessToken(
    claims: {
      sub: string;
      aud: string;
      client_id: string;
      scope: string;
      grant_id: string;
      project_id: string;
    },
    ttlSeconds: number,
  ): Promise<string> {
    const keys = await loadKeys();

    return jwt.sign(
      { ...claims, jti: openOpsId() },
      keys.signing.privateKeyPem,
      {
        algorithm: ALGORITHM,
        keyid: keys.signing.kid,
        issuer: oauthConfig.getIssuerUrl(),
        expiresIn: ttlSeconds,
      },
    );
  },

  // Audience is required here rather than checked by callers, so no code path can accept
  // a token minted for a different resource.
  async verifyAccessToken(
    token: string,
    expectedAudience: string,
  ): Promise<Record<string, unknown>> {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;

    if (!kid) {
      throw invalidGrant('token has no key id');
    }

    const keys = await loadKeys();
    const publicKeyPem = keys.verification.get(kid);

    if (!publicKeyPem) {
      throw invalidGrant('token signed by an unknown key');
    }

    try {
      return jwt.verify(token, publicKeyPem, {
        algorithms: [ALGORITHM],
        issuer: oauthConfig.getIssuerUrl(),
        audience: expectedAudience,
      }) as Record<string, unknown>;
    } catch (error) {
      throw invalidGrant(
        `token verification failed: ${(error as Error).message}`,
      );
    }
  },

  clearKeyCacheForTests(): void {
    cachedKeys = undefined;
  },
};
