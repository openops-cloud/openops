import { PrincipalType } from '@openops/shared';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ISSUER = 'https://ops.example.com/api';
const API_AUDIENCE = ISSUER;
const MCP_AUDIENCE = 'https://ops.example.com/mcp';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const OAUTH_PRIVATE_KEY = privateKey.export({
  type: 'pkcs8',
  format: 'pem',
}) as string;

const activeGrant = {
  id: 'grant-1',
  userId: 'user-1',
  clientId: 'client-1',
  projectId: 'project-1',
  scope: 'api',
  status: 'active' as const,
};

const activeUser = {
  id: 'user-1',
  externalId: 'ext-1',
  status: 'ACTIVE',
  organizationId: 'org-1',
  organizationRole: 'ADMIN',
};

const MEMBERSHIP = {
  projectId: 'project-1',
  organizationId: 'org-1',
  projectRole: 'ADMIN',
};

jest.mock('../../../src/app/oauth/grants.service', () => ({
  grantsService: {
    getActiveGrantOrThrow: jest.fn(async () => activeGrant),
    touch: jest.fn(async () => undefined),
  },
}));

jest.mock('../../../src/app/user/user-service', () => ({
  userService: {
    get: jest.fn(async () => activeUser),
  },
}));

const membershipService = {
  getDefaultForUser: jest.fn(),
  getForUser: jest.fn(),
};

jest.mock('../../../src/app/oauth/project-membership-factory', () => ({
  getOAuthProjectMembershipService: () => membershipService,
}));

import { accessTokenManager } from '../../../src/app/authentication/context/access-token-manager';
import { grantsService } from '../../../src/app/oauth/grants.service';
import { oauthConfig } from '../../../src/app/oauth/oauth-config';
import { invalidGrant, serverError } from '../../../src/app/oauth/oauth-errors';
import { signingKeyService } from '../../../src/app/oauth/signing-key.service';
import { userService } from '../../../src/app/user/user-service';

function signOAuthToken(
  overrides: Record<string, unknown> = {},
  options: jwt.SignOptions = {},
): string {
  return jwt.sign(
    {
      sub: 'user-1',
      client_id: 'client-1',
      scope: 'api',
      grant_id: 'grant-1',
      project_id: 'project-1',
      jti: 'jti-1',
      ...overrides,
    },
    OAUTH_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      keyid: 'oauth-kid',
      issuer: ISSUER,
      audience: API_AUDIENCE,
      expiresIn: 900,
      ...options,
    },
  );
}

describe('extractPrincipal with OAuth tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(oauthConfig, 'isEnabled').mockReturnValue(true);
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(API_AUDIENCE);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_AUDIENCE);

    // Stand in for the real key store: verify against the test keypair, and
    // enforce the audience exactly as the production implementation does.
    jest
      .spyOn(signingKeyService, 'verifyAccessToken')
      .mockImplementation(async (token, expectedAudience) => {
        const publicKey = crypto
          .createPublicKey(OAUTH_PRIVATE_KEY)
          .export({ type: 'spki', format: 'pem' }) as string;
        try {
          return jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: ISSUER,
            audience: expectedAudience,
          }) as Record<string, unknown>;
        } catch (error) {
          // The real implementation reports a bad token as an OAuthError, and the
          // caller distinguishes those from server faults. Mirror it here or this
          // mock would exercise a contract the production code never sees.
          throw invalidGrant((error as Error).message);
        }
      });

    (grantsService.getActiveGrantOrThrow as jest.Mock).mockResolvedValue(
      activeGrant,
    );
    (userService.get as jest.Mock).mockResolvedValue(activeUser);
    membershipService.getForUser.mockResolvedValue(MEMBERSHIP);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a SERVICE principal on the grant active project', async () => {
    const principal = await accessTokenManager.extractPrincipal(
      signOAuthToken(),
    );

    expect(principal).toEqual({
      id: 'user-1',
      externalId: 'ext-1',
      type: PrincipalType.SERVICE,
      projectId: 'project-1',
      projectRole: 'ADMIN',
      organization: { id: 'org-1', role: 'ADMIN' },
    });
  });

  it('acts on the project named by the token, not the one on the grant', async () => {
    // The grant records what the connection was authorized for; the token decides
    // what this particular credential may do.
    (grantsService.getActiveGrantOrThrow as jest.Mock).mockResolvedValue({
      ...activeGrant,
      projectId: 'project-1',
    });
    membershipService.getForUser.mockResolvedValue({
      projectId: 'project-2',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });

    const principal = await accessTokenManager.extractPrincipal(
      signOAuthToken({ project_id: 'project-2' }),
    );

    expect(membershipService.getForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'project-2',
    );
    expect(principal.projectId).toBe('project-2');
  });

  it('rejects a token that names no project', async () => {
    await expect(
      accessTokenManager.extractPrincipal(
        signOAuthToken({ project_id: undefined }),
      ),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('carries the project role the membership reports', async () => {
    membershipService.getForUser.mockResolvedValue({
      projectId: 'project-1',
      organizationId: 'org-1',
      projectRole: 'VIEWER',
    });

    const principal = await accessTokenManager.extractPrincipal(
      signOAuthToken(),
    );

    expect(principal.projectRole).toBe('VIEWER');
  });

  it('records last use so a direct connection is distinguishable in the list', async () => {
    await accessTokenManager.extractPrincipal(signOAuthToken());

    expect(grantsService.touch).toHaveBeenCalledWith('grant-1');
  });

  it('rejects a token minted for the mcp resource server', async () => {
    const mcpToken = signOAuthToken({}, { audience: MCP_AUDIENCE });

    await expect(accessTokenManager.extractPrincipal(mcpToken)).rejects.toThrow(
      'INVALID_BEARER_TOKEN',
    );
  });

  it('rejects a token for an unrelated audience', async () => {
    const foreignToken = signOAuthToken(
      {},
      { audience: 'https://elsewhere.example' },
    );

    await expect(
      accessTokenManager.extractPrincipal(foreignToken),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects a token from a different issuer', async () => {
    const foreignIssuer = signOAuthToken(
      {},
      { issuer: 'https://evil.example' },
    );

    await expect(
      accessTokenManager.extractPrincipal(foreignIssuer),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects an expired token', async () => {
    const expired = signOAuthToken({}, { expiresIn: -10 });

    await expect(accessTokenManager.extractPrincipal(expired)).rejects.toThrow(
      'INVALID_BEARER_TOKEN',
    );
  });

  it('rejects a token signed by a foreign key', async () => {
    const foreign = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign(
      { sub: 'attacker', grant_id: 'grant-1' },
      foreign.privateKey,
      {
        algorithm: 'RS256',
        keyid: 'oauth-kid',
        issuer: ISSUER,
        audience: API_AUDIENCE,
        expiresIn: 900,
      },
    );

    await expect(accessTokenManager.extractPrincipal(forged)).rejects.toThrow(
      'INVALID_BEARER_TOKEN',
    );
  });

  it('rejects when the grant has been revoked', async () => {
    (grantsService.getActiveGrantOrThrow as jest.Mock).mockRejectedValue(
      invalidGrant('the authorization for this client has been revoked'),
    );

    await expect(
      accessTokenManager.extractPrincipal(signOAuthToken()),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects when the token subject does not match the grant owner', async () => {
    const otherUsersToken = signOAuthToken({ sub: 'user-2' });

    await expect(
      accessTokenManager.extractPrincipal(otherUsersToken),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects when the user has been deactivated', async () => {
    (userService.get as jest.Mock).mockResolvedValue({
      ...activeUser,
      status: 'INACTIVE',
    });

    await expect(
      accessTokenManager.extractPrincipal(signOAuthToken()),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects when the user no longer exists', async () => {
    (userService.get as jest.Mock).mockResolvedValue(null);

    await expect(
      accessTokenManager.extractPrincipal(signOAuthToken()),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects when the user has no access to the token project', async () => {
    membershipService.getForUser.mockResolvedValue(null);

    await expect(
      accessTokenManager.extractPrincipal(signOAuthToken()),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
  });

  it('rejects a token with no grant binding', async () => {
    const unbound = signOAuthToken({ grant_id: undefined });

    await expect(accessTokenManager.extractPrincipal(unbound)).rejects.toThrow(
      'INVALID_BEARER_TOKEN',
    );
  });

  describe('server faults are not reported as bad credentials', () => {
    // An OAuth client that receives 401 discards its refresh token and re-runs
    // authorization. A database blip must therefore not look like one.
    it.each([
      ['the grant lookup', () => grantsService.getActiveGrantOrThrow],
      ['the user lookup', () => userService.get],
      ['the membership lookup', () => membershipService.getForUser],
    ])(
      'propagates a failure in %s instead of returning 401',
      async (_l, get) => {
        (get() as jest.Mock).mockRejectedValue(
          new Error('connection terminated unexpectedly'),
        );

        await expect(
          accessTokenManager.extractPrincipal(signOAuthToken()),
        ).rejects.toThrow('connection terminated unexpectedly');
      },
    );

    it('propagates a signing-key store failure instead of returning 401', async () => {
      (signingKeyService.verifyAccessToken as jest.Mock).mockRejectedValue(
        serverError('OAuth signing key is not initialized'),
      );

      await expect(
        accessTokenManager.extractPrincipal(signOAuthToken()),
      ).rejects.toThrow('signing key is not initialized');
    });
  });

  it('rejects OAuth tokens entirely when the feature is disabled', async () => {
    jest.spyOn(oauthConfig, 'isEnabled').mockReturnValue(false);

    await expect(
      accessTokenManager.extractPrincipal(signOAuthToken()),
    ).rejects.toThrow('INVALID_BEARER_TOKEN');
    expect(grantsService.getActiveGrantOrThrow).not.toHaveBeenCalled();
  });

  it('still accepts internal HS256 tokens, which never reach the OAuth path', async () => {
    const internalToken = await accessTokenManager.generateToken({
      id: 'user-9',
      type: PrincipalType.USER,
      projectId: 'project-9',
      projectRole: 'ADMIN',
      organization: { id: 'org-9', role: 'ADMIN' },
    } as never);

    const principal = await accessTokenManager.extractPrincipal(internalToken);

    expect(principal).toMatchObject({
      id: 'user-9',
      type: PrincipalType.USER,
      projectId: 'project-9',
    });
    expect(signingKeyService.verifyAccessToken).not.toHaveBeenCalled();
  });
});
