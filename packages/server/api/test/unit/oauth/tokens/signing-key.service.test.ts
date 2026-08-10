import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ISSUER = 'https://ops.example.com/api';
const API_AUDIENCE = ISSUER;
const MCP_AUDIENCE = 'https://ops.example.com/mcp';

type KeyRow = {
  id: string;
  privateKeyEncrypted: string;
  publicKeyPem: string;
  status: string;
};

const keyRows: KeyRow[] = [];

// Stand-in for AES: an invertible transform, so both "no plaintext PEM is stored" and
// "the service decrypts before signing" are testable without a real encryption key.
jest.mock('@openops/server-shared', () => {
  const actual = jest.requireActual('@openops/server-shared');
  return {
    ...actual,
    encryptUtils: {
      encryptString: (value: string) => ({
        iv: 'test-iv',
        data: Buffer.from(value, 'utf-8').toString('base64'),
      }),
      decryptString: (encrypted: { data: string }) =>
        Buffer.from(encrypted.data, 'base64').toString('utf-8'),
    },
  };
});

jest.mock('../../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    find: async () => [...keyRows],
    findOneBy: async (query: { status: string }) =>
      keyRows.find((row) => row.status === query.status) ?? null,
    insert: async (row: KeyRow) => {
      if (
        row.status === 'active' &&
        keyRows.some((existing) => existing.status === 'active')
      ) {
        const error = new Error('duplicate key') as Error & { code: string };
        error.code = '23505';
        throw error;
      }
      keyRows.push(row);
    },
  }),
}));

import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import { signingKeyService } from '../../../../src/app/oauth/tokens/signing-key.service';

describe('signingKeyService', () => {
  beforeEach(() => {
    keyRows.length = 0;
    signingKeyService.clearKeyCacheForTests();
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getSigningKeyPemPath').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates exactly one active key and is idempotent across calls', async () => {
    await signingKeyService.ensureSigningKey();
    await signingKeyService.ensureSigningKey();

    expect(keyRows).toHaveLength(1);
    expect(keyRows[0].status).toBe('active');
    expect(keyRows[0].publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('persists the private key only in encrypted form', async () => {
    await signingKeyService.ensureSigningKey();

    const stored = keyRows[0].privateKeyEncrypted;

    expect(stored).not.toContain('BEGIN PRIVATE KEY');
    expect(JSON.parse(stored).iv).toBe('test-iv');
    expect(
      Buffer.from(JSON.parse(stored).data, 'base64').toString('utf-8'),
    ).toContain('BEGIN PRIVATE KEY');
  });

  it('publishes the public key as a JWKS entry with kid, alg and use', async () => {
    await signingKeyService.ensureSigningKey();

    const jwks = await signingKeyService.getJwks();

    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: keyRows[0].id,
    });
    expect(jwks.keys[0].d).toBeUndefined();
  });

  it('signs a token that verifies for the expected audience', async () => {
    await signingKeyService.ensureSigningKey();

    const token = await signingKeyService.signAccessToken(
      {
        sub: 'user-1',
        aud: API_AUDIENCE,
        client_id: 'client-1',
        scope: 'api',
        grant_id: 'grant-1',
        project_id: 'project-1',
      },
      60,
    );

    const claims = await signingKeyService.verifyAccessToken(
      token,
      API_AUDIENCE,
    );

    expect(claims.sub).toBe('user-1');
    expect(claims.client_id).toBe('client-1');
    expect(claims.grant_id).toBe('grant-1');
    expect(claims.project_id).toBe('project-1');
    expect(claims.iss).toBe(ISSUER);
    expect(claims.jti).toEqual(expect.any(String));
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('RS256');
  });

  it('rejects a token whose audience is a different resource', async () => {
    await signingKeyService.ensureSigningKey();
    const token = await signingKeyService.signAccessToken(
      {
        sub: 'user-1',
        aud: MCP_AUDIENCE,
        client_id: 'client-1',
        scope: 'mcp',
        grant_id: 'grant-1',
        project_id: 'project-1',
      },
      60,
    );

    await expect(
      signingKeyService.verifyAccessToken(token, API_AUDIENCE),
    ).rejects.toThrow('invalid_grant');
  });

  it('rejects an expired token', async () => {
    await signingKeyService.ensureSigningKey();
    const token = await signingKeyService.signAccessToken(
      {
        sub: 'user-1',
        aud: API_AUDIENCE,
        client_id: 'client-1',
        scope: 'api',
        grant_id: 'grant-1',
        project_id: 'project-1',
      },
      -10,
    );

    await expect(
      signingKeyService.verifyAccessToken(token, API_AUDIENCE),
    ).rejects.toThrow('invalid_grant');
  });

  it('rejects a token signed by a key it does not know', async () => {
    await signingKeyService.ensureSigningKey();
    const foreign = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign({ sub: 'attacker' }, foreign.privateKey, {
      algorithm: 'RS256',
      keyid: 'unknown-kid',
      issuer: ISSUER,
      audience: API_AUDIENCE,
      expiresIn: 60,
    });

    await expect(
      signingKeyService.verifyAccessToken(forged, API_AUDIENCE),
    ).rejects.toThrow('unknown key');
  });

  it('rejects an unsigned (alg=none) token', async () => {
    await signingKeyService.ensureSigningKey();
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT', kid: keyRows[0].id }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'attacker', aud: API_AUDIENCE, iss: ISSUER }),
    ).toString('base64url');

    await expect(
      signingKeyService.verifyAccessToken(
        `${header}.${payload}.`,
        API_AUDIENCE,
      ),
    ).rejects.toThrow('invalid_grant');
  });

  it('rejects an HS256 token forged with the public key as the secret', async () => {
    await signingKeyService.ensureSigningKey();
    const forged = jwt.sign({ sub: 'attacker' }, keyRows[0].publicKeyPem, {
      algorithm: 'HS256',
      keyid: keyRows[0].id,
      issuer: ISSUER,
      audience: API_AUDIENCE,
      expiresIn: 60,
    });

    await expect(
      signingKeyService.verifyAccessToken(forged, API_AUDIENCE),
    ).rejects.toThrow('invalid_grant');
  });

  it('rejects a token with no key id', async () => {
    await signingKeyService.ensureSigningKey();
    const token = jwt.sign({ sub: 'x' }, 'secret', { algorithm: 'HS256' });

    await expect(
      signingKeyService.verifyAccessToken(token, API_AUDIENCE),
    ).rejects.toThrow('no key id');
  });

  it('keeps verifying tokens signed by a retiring key after rotation', async () => {
    await signingKeyService.ensureSigningKey();
    const oldKid = keyRows[0].id;
    const tokenFromOldKey = await signingKeyService.signAccessToken(
      {
        sub: 'user-1',
        aud: API_AUDIENCE,
        client_id: 'client-1',
        scope: 'api',
        grant_id: 'grant-1',
        project_id: 'project-1',
      },
      60,
    );

    // Rotate: demote the current key, add a new active one.
    keyRows[0].status = 'retiring';
    signingKeyService.clearKeyCacheForTests();
    await signingKeyService.ensureSigningKey();

    const newKid = keyRows.find((row) => row.status === 'active')?.id;
    expect(newKid).not.toBe(oldKid);

    const claims = await signingKeyService.verifyAccessToken(
      tokenFromOldKey,
      API_AUDIENCE,
    );
    expect(claims.sub).toBe('user-1');

    const jwks = await signingKeyService.getJwks();
    expect(jwks.keys.map((key) => key.kid).sort()).toEqual(
      [oldKid, newKid].sort(),
    );

    const tokenFromNewKey = await signingKeyService.signAccessToken(
      {
        sub: 'user-2',
        aud: API_AUDIENCE,
        client_id: 'client-1',
        scope: 'api',
        grant_id: 'grant-2',
        project_id: 'project-1',
      },
      60,
    );
    expect(jwt.decode(tokenFromNewKey, { complete: true })?.header.kid).toBe(
      newKid,
    );
  });

  it('stops verifying tokens once their key is fully retired', async () => {
    await signingKeyService.ensureSigningKey();
    const token = await signingKeyService.signAccessToken(
      {
        sub: 'user-1',
        aud: API_AUDIENCE,
        client_id: 'client-1',
        scope: 'api',
        grant_id: 'grant-1',
        project_id: 'project-1',
      },
      60,
    );

    keyRows[0].status = 'retiring';
    signingKeyService.clearKeyCacheForTests();
    await signingKeyService.ensureSigningKey();
    keyRows.find((row) => row.status === 'retiring')!.status = 'retired';
    signingKeyService.clearKeyCacheForTests();

    await expect(
      signingKeyService.verifyAccessToken(token, API_AUDIENCE),
    ).rejects.toThrow('unknown key');
  });

  it('fails clearly when no key has been initialized', async () => {
    await expect(signingKeyService.getJwks()).rejects.toThrow(
      'not initialized',
    );
  });
});
