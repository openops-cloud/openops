import crypto from 'node:crypto';

const API_URI = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';
const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CODE_CHALLENGE = crypto
  .createHash('sha256')
  .update(CODE_VERIFIER)
  .digest('base64url');

type Row = Record<string, unknown>;

const codeRows: Row[] = [];
const refreshRows: Row[] = [];

function matches(row: Row, criteria: Row): boolean {
  return Object.entries(criteria).every(([key, value]) => {
    if (value instanceof Object && value.constructor.name === 'FindOperator') {
      return row[key] === null || row[key] === undefined;
    }
    return row[key] === value;
  });
}

function makeRepo(store: Row[]) {
  return () => ({
    find: async (options?: { where?: Row }) =>
      store.filter((row) => matches(row, options?.where ?? {})),
    findOneBy: async (criteria: Row) =>
      store.find((row) => matches(row, criteria)) ?? null,
    insert: async (row: Row) => {
      store.push(row);
    },
    update: async (criteria: Row, patch: Row) => {
      const targets = store.filter((row) => matches(row, criteria));
      for (const target of targets) {
        Object.assign(target, patch);
      }
      return { affected: targets.length };
    },
  });
}

jest.mock('../../../../src/app/core/db/repo-factory', () => ({
  repoFactory: (entity: { options: { name: string } }) =>
    entity.options.name === 'oauth_authorization_code'
      ? makeRepo(codeRows)
      : makeRepo(refreshRows),
}));

const MEMBERSHIP = {
  projectId: 'project-1',
  organizationId: 'org-1',
  projectRole: 'ADMIN',
};

const mockGrant = {
  id: 'grant-1',
  userId: 'user-1',
  clientId: 'client-1',
  projectId: 'project-1',
  scope: 'mcp',
  status: 'active' as const,
};

jest.mock('../../../../src/app/oauth/clients/grants.service', () => ({
  grantsService: {
    create: jest.fn(async () => mockGrant),
    getActiveGrantOrThrow: jest.fn(async () => mockGrant),
    getGrantSnapshot: jest.fn(async () => mockGrant),
    revoke: jest.fn(async () => undefined),
  },
}));

jest.mock('../../../../src/app/user/user-service', () => ({
  userService: {
    get: jest.fn(async () => ({
      id: 'user-1',
      status: 'ACTIVE',
      organizationId: 'org-1',
    })),
  },
}));

type Membership = typeof MEMBERSHIP | null;

const membershipService = {
  getDefaultForUser: jest.fn<Promise<Membership>, unknown[]>(),
  getForUser: jest.fn<Promise<Membership>, unknown[]>(),
};

jest.mock(
  '../../../../src/app/oauth/projects/project-membership-factory',
  () => ({
    getOAuthProjectMembershipService: () => membershipService,
  }),
);

import { grantsService } from '../../../../src/app/oauth/clients/grants.service';
import { sha256Hex } from '../../../../src/app/oauth/common/oauth-crypto';
import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import { OAuthPendingAuthorization } from '../../../../src/app/oauth/storage/oauth-model';
import { signingKeyService } from '../../../../src/app/oauth/tokens/signing-key.service';
import { tokensService } from '../../../../src/app/oauth/tokens/tokens.service';
import { userService } from '../../../../src/app/user/user-service';

const PENDING: OAuthPendingAuthorization = {
  id: 'pending-1',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  clientId: 'client-1',
  redirectUri: 'https://client.example/cb',
  codeChallenge: CODE_CHALLENGE,
  resource: MCP_URI,
  scope: 'mcp',
  state: 'state-1',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  consumedAt: null,
};

function redeemParams(overrides: Partial<Record<string, string>> = {}) {
  return {
    code: 'unset',
    clientId: 'client-1',
    redirectUri: 'https://client.example/cb',
    codeVerifier: CODE_VERIFIER,
    resource: MCP_URI,
    ...overrides,
  } as Parameters<typeof tokensService.redeemAuthorizationCode>[0];
}

describe('tokensService', () => {
  beforeEach(() => {
    codeRows.length = 0;
    refreshRows.length = 0;
    jest.clearAllMocks();

    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(API_URI);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);
    jest.spyOn(oauthConfig, 'getAccessTokenTtlSeconds').mockReturnValue(900);
    jest.spyOn(oauthConfig, 'getRefreshTokenTtlDays').mockReturnValue(30);
    jest.spyOn(oauthConfig, 'getExchangeTokenTtlSeconds').mockReturnValue(300);
    jest
      .spyOn(signingKeyService, 'signAccessToken')
      .mockImplementation(async (claims, ttl) =>
        JSON.stringify({ ...claims, ttl }),
      );
    (grantsService.create as jest.Mock).mockResolvedValue(mockGrant);
    (grantsService.getActiveGrantOrThrow as jest.Mock).mockResolvedValue(
      mockGrant,
    );
    (grantsService.getGrantSnapshot as jest.Mock).mockResolvedValue(mockGrant);
    (userService.get as jest.Mock).mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      organizationId: 'org-1',
    });
    membershipService.getDefaultForUser.mockResolvedValue(MEMBERSHIP);
    // Echoes the project it is asked about: a fixed membership would make every caller
    // look correct no matter which project it passed.
    membershipService.getForUser.mockImplementation(
      async (_user: unknown, projectId: unknown) => ({
        ...MEMBERSHIP,
        projectId: projectId as string,
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('issueAuthorizationCode', () => {
    it('stores only a hash of the code and copies the validated parameters', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      expect(codeRows).toHaveLength(1);
      expect(codeRows[0].codeHash).toBe(sha256Hex(code));
      expect(Object.values(codeRows[0])).not.toContain(code);
      expect(codeRows[0]).toMatchObject({
        clientId: 'client-1',
        userId: 'user-1',
        redirectUri: 'https://client.example/cb',
        codeChallenge: CODE_CHALLENGE,
        resource: MCP_URI,
        scope: 'mcp',
        consumedAt: null,
      });
    });

    it('expires the code within a minute', async () => {
      await tokensService.issueAuthorizationCode(PENDING, 'user-1');

      const expiresAt = new Date(codeRows[0].expiresAt as string).getTime();
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(60_000);
      expect(expiresAt - Date.now()).toBeGreaterThan(50_000);
    });
  });

  describe('redeemAuthorizationCode', () => {
    it('returns an access token and refresh token for a valid redemption', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );

      expect(response).toMatchObject({
        token_type: 'Bearer',
        expires_in: 900,
        scope: 'mcp',
      });
      expect(response.refresh_token).toEqual(expect.any(String));
      expect(JSON.parse(response.access_token)).toMatchObject({
        sub: 'user-1',
        aud: MCP_URI,
        client_id: 'client-1',
        scope: 'mcp',
        grant_id: 'grant-1',
      });
    });

    it('records the project on the refresh token, not the grant', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      await tokensService.redeemAuthorizationCode(redeemParams({ code }));

      // The chain carries it forward, so a plain renewal stays where the connection is.
      expect(refreshRows[0].projectId).toBe('project-1');
    });

    it('pins the project into the token claims', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );

      expect(JSON.parse(response.access_token).project_id).toBe('project-1');
    });

    it('binds the access token to the mcp audience, never the api audience', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );

      expect(JSON.parse(response.access_token).aud).not.toBe(API_URI);
    });

    it('stores the refresh token hashed, with a fresh family', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );

      expect(refreshRows).toHaveLength(1);
      expect(refreshRows[0].tokenHash).toBe(
        sha256Hex(response.refresh_token as string),
      );
      expect(Object.values(refreshRows[0])).not.toContain(
        response.refresh_token,
      );
      expect(refreshRows[0].familyId).toEqual(expect.any(String));
      expect(refreshRows[0].grantId).toBe('grant-1');
    });

    it('activates the grant only on redemption', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      expect(grantsService.create).not.toHaveBeenCalled();

      await tokensService.redeemAuthorizationCode(redeemParams({ code }));

      expect(grantsService.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        userId: 'user-1',
        resourceId: 'mcp',
      });
    });

    it('rejects a replayed code and issues no second token', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      await tokensService.redeemAuthorizationCode(redeemParams({ code }));

      await expect(
        tokensService.redeemAuthorizationCode(redeemParams({ code })),
      ).rejects.toThrow('invalid or expired authorization code');
      expect(refreshRows).toHaveLength(1);
    });

    it('lets exactly one of two concurrent redemptions succeed', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      const results = await Promise.allSettled([
        tokensService.redeemAuthorizationCode(redeemParams({ code })),
        tokensService.redeemAuthorizationCode(redeemParams({ code })),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(refreshRows).toHaveLength(1);
    });

    it('rejects an unknown code', async () => {
      await expect(
        tokensService.redeemAuthorizationCode(redeemParams({ code: 'nope' })),
      ).rejects.toThrow('invalid or expired authorization code');
    });

    it('rejects an expired code', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      codeRows[0].expiresAt = new Date(Date.now() - 1000).toISOString();

      await expect(
        tokensService.redeemAuthorizationCode(redeemParams({ code })),
      ).rejects.toThrow('invalid or expired authorization code');
      expect(refreshRows).toHaveLength(0);
    });

    it.each([
      ['a different client', { clientId: 'other-client' }],
      ['a different redirect uri', { redirectUri: 'https://evil.example/cb' }],
      ['a different resource', { resource: API_URI }],
      ['an unknown resource', { resource: 'https://elsewhere.example' }],
      ['a wrong pkce verifier', { codeVerifier: 'x'.repeat(43) }],
    ])('rejects redemption with %s', async (_label, overrides) => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );

      await expect(
        tokensService.redeemAuthorizationCode(
          redeemParams({ code, ...overrides }),
        ),
      ).rejects.toThrow('invalid or expired authorization code');
      expect(refreshRows).toHaveLength(0);
    });

    it('rejects redemption for a deactivated user', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      (userService.get as jest.Mock).mockResolvedValue({
        id: 'user-1',
        status: 'INACTIVE',
      });

      await expect(
        tokensService.redeemAuthorizationCode(redeemParams({ code })),
      ).rejects.toThrow('no longer active');
      expect(refreshRows).toHaveLength(0);
    });
  });

  describe('rotateRefreshToken', () => {
    async function issueInitialTokens(): Promise<string> {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );
      return response.refresh_token as string;
    }

    it('issues a new pair and revokes the presented token', async () => {
      const original = await issueInitialTokens();

      const rotated = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      expect(rotated.refresh_token).not.toBe(original);
      expect(refreshRows).toHaveLength(2);
      expect(refreshRows[0].revokedAt).toEqual(expect.any(String));
      expect(refreshRows[1].revokedAt).toBeNull();
    });

    it('keeps the rotated token in the same family', async () => {
      const original = await issueInitialTokens();

      await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      expect(refreshRows[1].familyId).toBe(refreshRows[0].familyId);
    });

    it('revokes the entire family when a rotated token is presented again', async () => {
      const original = await issueInitialTokens();
      const rotated = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('refresh token reuse detected');

      // The whole chain is untrusted once a replay is observed, the real client's token
      // included.
      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: rotated.refresh_token as string,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('refresh token reuse detected');
      expect(refreshRows.every((row) => row.revokedAt !== null)).toBe(true);
    });

    it('reports a revoked connection as revoked, not as a replay', async () => {
      const original = await issueInitialTokens();
      // Revoking a grant also revokes its tokens, so the claim fails for a reason that is
      // not an attack.
      refreshRows[0].revokedAt = new Date().toISOString();
      (grantsService.getGrantSnapshot as jest.Mock).mockResolvedValue({
        ...mockGrant,
        status: 'revoked',
      });

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('has been revoked');
    });

    it('refuses to refresh once the user loses access to the project', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockResolvedValue(null);

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('not accessible');
    });

    it('re-authorizes the project on every rotation', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockClear();

      await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      expect(membershipService.getForUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        'project-1',
      );
    });

    it('switches the connection to a requested project', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockResolvedValue({
        projectId: 'project-2',
        organizationId: 'org-1',
        projectRole: 'ADMIN',
      });

      const rotated = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
        requestedProjectId: 'project-2',
      });

      expect(membershipService.getForUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        'project-2',
      );
      expect(JSON.parse(rotated.access_token).project_id).toBe('project-2');
    });

    it('refuses a requested project the user is not a member of', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockResolvedValue(null);

      // invalid_target, not invalid_grant: the client asked for something it may not have,
      // which it can correct.
      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
          requestedProjectId: 'someone-elses',
        }),
      ).rejects.toMatchObject({ errorCode: 'invalid_target' });
    });

    it('leaves the refresh token usable when a switch is refused', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockResolvedValue(null);

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
          requestedProjectId: 'someone-elses',
        }),
      ).rejects.toMatchObject({ errorCode: 'invalid_target' });

      // A rejected switch must not cost the connection its credential: consuming the
      // token would brick a working agent, and its retry would look like a replay.
      membershipService.getForUser.mockResolvedValue(MEMBERSHIP);
      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).resolves.toEqual(
        expect.objectContaining({ access_token: expect.any(String) }),
      );
    });

    it('keeps a switched project across a later plain refresh', async () => {
      const original = await issueInitialTokens();

      const switched = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
        requestedProjectId: 'project-2',
      });

      const renewed = await tokensService.rotateRefreshToken({
        refreshToken: switched.refresh_token as string,
        clientId: 'client-1',
      });

      // Must not fall back to where the connection started: renewing hands back an
      // equivalent credential, not one pointing somewhere else.
      expect(JSON.parse(renewed.access_token).project_id).toBe('project-2');
    });

    it('stays where it is when no project is requested', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockClear();

      const rotated = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      expect(membershipService.getForUser).toHaveBeenCalledWith(
        expect.anything(),
        'project-1',
      );
      expect(JSON.parse(rotated.access_token).project_id).toBe('project-1');
    });

    it('rejects an unknown refresh token', async () => {
      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: 'nope',
          clientId: 'client-1',
        }),
      ).rejects.toThrow('invalid refresh token');
    });

    it('rejects rotation by a different client without destroying the token', async () => {
      const original = await issueInitialTokens();

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'other-client',
        }),
      ).rejects.toThrow('invalid refresh token');

      // A rejected request must leave the credential usable, or the client's next attempt
      // would look like a replay and kill the connection.
      expect(refreshRows[0].revokedAt).toBeNull();
      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).resolves.toMatchObject({ token_type: 'Bearer' });
    });

    it('rejects an expired refresh token without consuming it', async () => {
      const original = await issueInitialTokens();
      refreshRows[0].expiresAt = new Date(Date.now() - 1000).toISOString();

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('expired');
      expect(refreshRows[0].revokedAt).toBeNull();
    });

    it('does not revoke the family when the project is no longer accessible', async () => {
      const original = await issueInitialTokens();
      membershipService.getForUser.mockResolvedValue(null);

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('not accessible');
      expect(refreshRows[0].revokedAt).toBeNull();
    });

    it('refuses to refresh once the grant is revoked', async () => {
      const original = await issueInitialTokens();
      (grantsService.getActiveGrantOrThrow as jest.Mock).mockRejectedValue(
        new Error('the authorization for this client has been revoked'),
      );

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('revoked');
    });

    it('survives a transient failure so the retry is not read as a replay', async () => {
      const original = await issueInitialTokens();
      (userService.get as jest.Mock).mockRejectedValueOnce(
        new Error('connection terminated unexpectedly'),
      );

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('connection terminated');

      expect(refreshRows[0].revokedAt).toBeNull();

      const retry = await tokensService.rotateRefreshToken({
        refreshToken: original,
        clientId: 'client-1',
      });

      expect(retry.refresh_token).toEqual(expect.any(String));
      expect(refreshRows.every((row) => row.revokedAt !== null)).toBe(false);
    });

    it('refuses to refresh for a deactivated user', async () => {
      const original = await issueInitialTokens();
      (userService.get as jest.Mock).mockResolvedValue({
        id: 'user-1',
        status: 'INACTIVE',
      });

      await expect(
        tokensService.rotateRefreshToken({
          refreshToken: original,
          clientId: 'client-1',
        }),
      ).rejects.toThrow('no longer active');
    });
  });

  describe('revokeByRefreshToken', () => {
    it('revokes the grant behind the token', async () => {
      const code = await tokensService.issueAuthorizationCode(
        PENDING,
        'user-1',
      );
      const response = await tokensService.redeemAuthorizationCode(
        redeemParams({ code }),
      );

      await tokensService.revokeByRefreshToken(
        response.refresh_token as string,
      );

      expect(grantsService.revoke).toHaveBeenCalledWith('grant-1');
    });

    it('ignores an unknown token, as RFC 7009 requires', async () => {
      await expect(
        tokensService.revokeByRefreshToken('unknown'),
      ).resolves.toBeUndefined();
      expect(grantsService.revoke).not.toHaveBeenCalled();
    });
  });

  describe('mintExchangedApiToken', () => {
    it('mints a short-lived api-audience token for the grant', async () => {
      const result = await tokensService.mintExchangedApiToken({
        grant: mockGrant,
        scope: 'api',
        projectId: 'project-7',
      });

      expect(result.expiresIn).toBe(300);
      expect(JSON.parse(result.accessToken)).toMatchObject({
        sub: 'user-1',
        aud: API_URI,
        grant_id: 'grant-1',
        scope: 'api',
        project_id: 'project-7',
        ttl: 300,
      });
    });
  });
});
