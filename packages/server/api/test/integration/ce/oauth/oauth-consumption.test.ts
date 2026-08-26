import { encryptUtils } from '@openops/server-shared';
import { openOpsId, UserStatus } from '@openops/shared';
import { IsNull } from 'typeorm';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { pendingAuthorizationService } from '../../../../src/app/oauth/authorization/pending-authorization.service';
import { grantsService } from '../../../../src/app/oauth/clients/grants.service';
import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import { oauthCleanupJobHandler } from '../../../../src/app/oauth/oauth-cleanup-job';
import { signingKeyService } from '../../../../src/app/oauth/tokens/signing-key.service';
import { tokensService } from '../../../../src/app/oauth/tokens/tokens.service';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

/**
 * The guarantees in-memory repositories cannot observe: that single-use consumption really
 * is a conditional UPDATE the database serialises, and that the cleanup job's SQL deletes
 * the rows it should and no others. Runs on SQLite rather than the production driver, but
 * against a real ORM and real SQL, which is where the risk was.
 */

const ISSUER = 'http://localhost:3000';
const MCP_RESOURCE = 'http://localhost:3020/mcp';
const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const CLIENT_ID = 'oauthitclient00000001';
const OTHER_CLIENT_ID = 'oauthitclient00000002';
const LONG_AGO = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();

let userId: string;
let projectId: string;

const repo = (table: string) => databaseConnection().getRepository(table);

async function seedClients(): Promise<void> {
  for (const id of [CLIENT_ID, OTHER_CLIENT_ID]) {
    await repo('oauth_client').save({
      id,
      clientName: 'Integration Test Client',
      redirectUris: ['https://client.example/cb'],
      grantTypes: ['authorization_code', 'refresh_token'],
      tokenEndpointAuthMethod: 'none',
      clientSecretHash: null,
      scope: '',
    });
  }
}

async function newPendingRequest(): Promise<string> {
  return pendingAuthorizationService.create({
    clientId: CLIENT_ID,
    redirectUri: 'https://client.example/cb',
    codeChallenge: CODE_CHALLENGE,
    resource: MCP_RESOURCE,
    scope: 'mcp',
    state: null,
  });
}

async function newAuthorizationCode(): Promise<string> {
  const requestId = await newPendingRequest();
  const pending = await pendingAuthorizationService.get(requestId);

  return tokensService.issueAuthorizationCode(pending, userId);
}

function redeemParams(code: string) {
  return {
    code,
    clientId: CLIENT_ID,
    redirectUri: 'https://client.example/cb',
    codeVerifier: CODE_VERIFIER,
    resource: MCP_RESOURCE,
  };
}

async function issueConnection(): Promise<string> {
  const code = await newAuthorizationCode();
  const response = await tokensService.redeemAuthorizationCode(
    redeemParams(code),
  );

  return response.refresh_token as string;
}

beforeAll(async () => {
  encryptUtils.loadEncryptionKey();
  await databaseConnection().initialize();

  jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);
  jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(ISSUER);
  jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_RESOURCE);
  jest.spyOn(oauthConfig, 'getAccessTokenTtlSeconds').mockReturnValue(900);
  jest.spyOn(oauthConfig, 'getRefreshTokenTtlDays').mockReturnValue(30);
  jest.spyOn(oauthConfig, 'getExchangeTokenTtlSeconds').mockReturnValue(300);
  jest.spyOn(oauthConfig, 'getSigningKeyPemPath').mockReturnValue(undefined);

  await signingKeyService.ensureSigningKey();

  const user = createMockUser({
    email: `oauth-it-${Date.now()}@openops.com`,
    verified: true,
    status: UserStatus.ACTIVE,
  });
  await repo('user').save(user);

  const organization = createMockOrganization({ ownerId: user.id });
  await repo('organization').save(organization);
  await repo('user').update(user.id, { organizationId: organization.id });

  const project = createMockProject({
    ownerId: user.id,
    organizationId: organization.id,
  });
  await repo('project').save(project);

  // Redeeming a code resolves the user's default project. The lookup reads membership from
  // project_users when that table is part of the schema, so seed a row where it exists.
  if (databaseConnection().hasMetadata('project_users')) {
    await repo('project_users').save({
      id: openOpsId(),
      userId: user.id,
      projectId: project.id,
      projectRole: 'ADMIN',
      defaultProject: true,
    });
  }

  userId = user.id;
  projectId = project.id;
});

afterAll(async () => {
  await databaseConnection().destroy();
});

async function clearTable(table: string): Promise<void> {
  await repo(table).createQueryBuilder().delete().execute();
}

async function updateAll(
  table: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await repo(table).createQueryBuilder().update().set(patch).execute();
}

beforeEach(async () => {
  for (const table of [
    'oauth_refresh_token',
    'oauth_authorization_code',
    'oauth_pending_authorization',
    'oauth_grant',
    'oauth_client',
  ]) {
    await clearTable(table);
  }
  grantsService.clearSnapshotCacheForTests();
  signingKeyService.clearKeyCacheForTests();
  await seedClients();
});

describe('authorization code consumption', () => {
  it('lets exactly one of many concurrent redemptions succeed', async () => {
    const code = await newAuthorizationCode();

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        tokensService.redeemAuthorizationCode(redeemParams(code)),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    // One connection and one refresh token, not eight.
    expect(await repo('oauth_grant').count()).toBe(1);
    expect(await repo('oauth_refresh_token').count()).toBe(1);
  });

  it('rejects a sequential replay and issues nothing further', async () => {
    const code = await newAuthorizationCode();
    await tokensService.redeemAuthorizationCode(redeemParams(code));

    await expect(
      tokensService.redeemAuthorizationCode(redeemParams(code)),
    ).rejects.toThrow('invalid or expired authorization code');
    expect(await repo('oauth_refresh_token').count()).toBe(1);
  });

  it('rejects a code whose expiry has passed', async () => {
    const code = await newAuthorizationCode();
    await updateAll('oauth_authorization_code', {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(
      tokensService.redeemAuthorizationCode(redeemParams(code)),
    ).rejects.toThrow('invalid or expired authorization code');
    expect(await repo('oauth_refresh_token').count()).toBe(0);
  });

  it('creates an independent connection per authorization for one client', async () => {
    await tokensService.redeemAuthorizationCode(
      redeemParams(await newAuthorizationCode()),
    );
    await tokensService.redeemAuthorizationCode(
      redeemParams(await newAuthorizationCode()),
    );

    expect(await repo('oauth_grant').count()).toBe(2);
  });
});

describe('pending authorization consumption', () => {
  it('lets exactly one of many concurrent decisions succeed', async () => {
    const requestId = await newPendingRequest();

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        pendingAuthorizationService.consume(requestId),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('refuses an expired request', async () => {
    const requestId = await newPendingRequest();
    await repo('oauth_pending_authorization').update(
      { id: requestId },
      { expiresAt: new Date(Date.now() - 1000).toISOString() },
    );

    await expect(pendingAuthorizationService.get(requestId)).rejects.toThrow(
      'unknown or expired authorization request',
    );
    await expect(
      pendingAuthorizationService.consume(requestId),
    ).rejects.toThrow('unknown or expired authorization request');
  });
});

describe('refresh token rotation', () => {
  it('lets exactly one of many concurrent rotations succeed', async () => {
    const refreshToken = await issueConnection();

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        tokensService.rotateRefreshToken({ refreshToken, clientId: CLIENT_ID }),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('revokes the whole family when a rotated token is replayed', async () => {
    const original = await issueConnection();
    await tokensService.rotateRefreshToken({
      refreshToken: original,
      clientId: CLIENT_ID,
    });

    await expect(
      tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow('reuse detected');

    expect(
      await repo('oauth_refresh_token').count({
        where: { revokedAt: IsNull() },
      }),
    ).toBe(0);
  });

  it('leaves the token usable when the request is rejected for another reason', async () => {
    const refreshToken = await issueConnection();

    await expect(
      tokensService.rotateRefreshToken({
        refreshToken,
        clientId: OTHER_CLIENT_ID,
      }),
    ).rejects.toThrow('invalid refresh token');

    await expect(
      tokensService.rotateRefreshToken({ refreshToken, clientId: CLIENT_ID }),
    ).resolves.toMatchObject({ token_type: 'Bearer' });
  });
});

describe('revocation', () => {
  it('cascades to the refresh tokens of that connection only', async () => {
    await issueConnection();
    await issueConnection();

    const grants = await repo('oauth_grant').find({
      order: { created: 'ASC' },
    });
    await grantsService.revoke(grants[0].id);

    const rows = await repo('oauth_refresh_token').find();
    const revokedFor = (grantId: string) =>
      rows.find((row) => row.grantId === grantId)?.revokedAt !== null;

    expect(revokedFor(grants[0].id)).toBe(true);
    expect(revokedFor(grants[1].id)).toBe(false);
  });

  it('stops a revoked connection from refreshing', async () => {
    const refreshToken = await issueConnection();
    const [grant] = await repo('oauth_grant').find();

    await grantsService.revoke(grant.id);

    await expect(
      tokensService.rotateRefreshToken({ refreshToken, clientId: CLIENT_ID }),
    ).rejects.toThrow('has been revoked');
  });
});

describe('cleanup job', () => {
  it('deletes expired records and leaves live ones usable', async () => {
    // Issuing a code also leaves its own (still live) pending record behind.
    const liveCode = await newAuthorizationCode();
    const liveRequest = await newPendingRequest();
    const expiredRequest = await newPendingRequest();
    const liveCount = await repo('oauth_pending_authorization').count();

    await repo('oauth_pending_authorization').update(
      { id: expiredRequest },
      { expiresAt: new Date(Date.now() - 60_000).toISOString() },
    );

    await oauthCleanupJobHandler();

    expect(await repo('oauth_pending_authorization').count()).toBe(
      liveCount - 1,
    );
    await expect(
      pendingAuthorizationService.get(liveRequest),
    ).resolves.toMatchObject({ clientId: CLIENT_ID });
    await expect(
      tokensService.redeemAuthorizationCode(redeemParams(liveCode)),
    ).resolves.toMatchObject({ token_type: 'Bearer' });
  });

  it('deletes an expired authorization code', async () => {
    await newAuthorizationCode();
    await updateAll('oauth_authorization_code', {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    await oauthCleanupJobHandler();

    expect(await repo('oauth_authorization_code').count()).toBe(0);
  });

  it('removes a connection only once it has no usable refresh token left', async () => {
    await issueConnection();
    await updateAll('oauth_grant', { created: LONG_AGO, lastUsedAt: null });

    // A live refresh token still exists, so the connection must survive.
    await oauthCleanupJobHandler();
    expect(await repo('oauth_grant').count()).toBe(1);

    await updateAll('oauth_refresh_token', { revokedAt: LONG_AGO });

    await oauthCleanupJobHandler();
    expect(await repo('oauth_grant').count()).toBe(0);
  });

  it('keeps a recently used connection even with no live refresh token', async () => {
    await issueConnection();
    // Old row, but used moments ago: the cutoff is on last use, not on age.
    await updateAll('oauth_grant', {
      created: LONG_AGO,
      lastUsedAt: new Date().toISOString(),
    });
    await updateAll('oauth_refresh_token', { revokedAt: LONG_AGO });

    await oauthCleanupJobHandler();

    expect(await repo('oauth_grant').count()).toBe(1);
  });

  it('keeps a client a connection still references, and deletes one nothing does', async () => {
    await issueConnection();
    await updateAll('oauth_client', { created: LONG_AGO });

    await oauthCleanupJobHandler();

    const remaining = await repo('oauth_client').find();
    expect(remaining.map((row) => row.id)).toEqual([CLIENT_ID]);
  });
});

describe('signing keys', () => {
  it('keeps a token verifiable after its key starts retiring', async () => {
    const token = await signingKeyService.signAccessToken(
      {
        sub: userId,
        aud: ISSUER,
        client_id: CLIENT_ID,
        scope: 'api',
        grant_id: 'grant000000000000001',
        project_id: projectId,
      },
      900,
    );

    await repo('oauth_signing_key').update(
      { status: 'active' },
      { status: 'retiring' },
    );
    signingKeyService.clearKeyCacheForTests();
    await signingKeyService.ensureSigningKey();

    await expect(
      signingKeyService.verifyAccessToken(token, ISSUER),
    ).resolves.toMatchObject({ sub: userId });
    expect((await signingKeyService.getJwks()).keys).toHaveLength(2);
  });
});
