const API_URI = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
const TOKEN_EXCHANGE_GRANT_TYPE =
  'urn:ietf:params:oauth:grant-type:token-exchange';
const BASIC_HEADER = `Basic ${Buffer.from('openops-mcp-rs:secret').toString(
  'base64',
)}`;

const RS_CLIENT = {
  id: 'openops-mcp-rs',
  clientName: 'OpenOps MCP Resource Server',
  redirectUris: [],
  grantTypes: [TOKEN_EXCHANGE_GRANT_TYPE],
  tokenEndpointAuthMethod: 'client_secret_basic' as const,
  clientSecretHash: 'x'.repeat(64),
  scope: 'mcp',
};

const MCP_GRANT = {
  id: 'grant-1',
  userId: 'user-1',
  clientId: 'client-1',
  projectId: 'project-1',
  scope: 'mcp',
  status: 'active' as const,
};

jest.mock('../../../../src/app/oauth/clients/clients.service', () => ({
  TOKEN_EXCHANGE_GRANT: 'urn:ietf:params:oauth:grant-type:token-exchange',
  clientsService: {
    authenticateResourceServerClient: jest.fn(),
    assertGrantTypeAllowed: jest.fn(),
  },
}));

jest.mock('../../../../src/app/oauth/clients/grants.service', () => ({
  grantsService: {
    getActiveGrantOrThrow: jest.fn(),
    touch: jest.fn(),
  },
}));

jest.mock('../../../../src/app/oauth/tokens/tokens.service', () => ({
  tokensService: {
    mintExchangedApiToken: jest.fn(),
  },
}));

jest.mock('../../../../src/app/oauth/tokens/signing-key.service', () => ({
  signingKeyService: {
    verifyAccessToken: jest.fn(),
  },
}));

jest.mock('../../../../src/app/user/user-service', () => ({
  userService: {
    get: jest.fn(),
  },
}));

const membershipService = {
  getDefaultForUser: jest.fn(),
  getForUser: jest.fn(),
};

jest.mock(
  '../../../../src/app/oauth/projects/project-membership-factory',
  () => ({
    getOAuthProjectMembershipService: () => membershipService,
  }),
);

import {
  clientsService,
  TOKEN_EXCHANGE_GRANT,
} from '../../../../src/app/oauth/clients/clients.service';
import { grantsService } from '../../../../src/app/oauth/clients/grants.service';
import { OAuthError } from '../../../../src/app/oauth/common/oauth-errors';
import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import { signingKeyService } from '../../../../src/app/oauth/tokens/signing-key.service';
import {
  exchangeToken,
  ExchangeTokenParams,
} from '../../../../src/app/oauth/tokens/token-exchange';
import { tokensService } from '../../../../src/app/oauth/tokens/tokens.service';
import { userService } from '../../../../src/app/user/user-service';

const authenticateMock =
  clientsService.authenticateResourceServerClient as jest.Mock;
const assertGrantTypeMock = clientsService.assertGrantTypeAllowed as jest.Mock;
const verifyAccessTokenMock = signingKeyService.verifyAccessToken as jest.Mock;
const getActiveGrantMock = grantsService.getActiveGrantOrThrow as jest.Mock;
const touchMock = grantsService.touch as jest.Mock;
const mintMock = tokensService.mintExchangedApiToken as jest.Mock;
const userGetMock = userService.get as jest.Mock;
const getForUserMock = membershipService.getForUser as jest.Mock;

function exchangeParams(
  overrides: Partial<ExchangeTokenParams> = {},
): ExchangeTokenParams {
  return {
    authorizationHeader: BASIC_HEADER,
    subjectToken: 'mcp-audience-token',
    ...overrides,
  };
}

describe('exchangeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(API_URI);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);

    authenticateMock.mockResolvedValue(RS_CLIENT);
    assertGrantTypeMock.mockReturnValue(undefined);
    verifyAccessTokenMock.mockResolvedValue({
      sub: 'user-1',
      aud: MCP_URI,
      client_id: 'client-1',
      scope: 'mcp',
      grant_id: 'grant-1',
      project_id: 'project-1',
    });
    getActiveGrantMock.mockResolvedValue(MCP_GRANT);
    touchMock.mockResolvedValue(undefined);
    mintMock.mockResolvedValue({
      accessToken: 'api-audience-token',
      expiresIn: 300,
    });
    userGetMock.mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      organizationId: 'org-1',
    });
    getForUserMock.mockResolvedValue({
      projectId: 'project-1',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a separate api-audience token for a verified mcp token', async () => {
    const response = await exchangeToken(exchangeParams());

    expect(response).toEqual({
      access_token: 'api-audience-token',
      issued_token_type: ACCESS_TOKEN_TYPE,
      token_type: 'Bearer',
      expires_in: 300,
      scope: 'api',
    });
    expect(response.access_token).not.toBe('mcp-audience-token');
    expect(mintMock).toHaveBeenCalledWith({
      grant: { id: 'grant-1', userId: 'user-1', clientId: 'client-1' },
      scope: 'api',
      projectId: 'project-1',
    });
  });

  it('records usage on the grant', async () => {
    await exchangeToken(exchangeParams());

    expect(touchMock).toHaveBeenCalledWith('grant-1');
  });

  it('requires the subject token to carry the mcp audience, never the api audience', async () => {
    await exchangeToken(exchangeParams());

    expect(verifyAccessTokenMock).toHaveBeenCalledWith(
      'mcp-audience-token',
      MCP_URI,
    );
    expect(verifyAccessTokenMock.mock.calls[0][1]).not.toBe(API_URI);
  });

  it('only allows a client registered for the token-exchange grant', async () => {
    await exchangeToken(exchangeParams());

    expect(assertGrantTypeMock).toHaveBeenCalledWith(
      RS_CLIENT,
      TOKEN_EXCHANGE_GRANT,
    );
  });

  it('authenticates the client before touching the subject token', async () => {
    authenticateMock.mockRejectedValue(
      new OAuthError('invalid_client', 'client authentication failed', 401),
    );

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'client authentication failed',
    );
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects a client that is not allowed the token-exchange grant', async () => {
    assertGrantTypeMock.mockImplementation(() => {
      throw new OAuthError(
        'unauthorized_client',
        `client is not authorized to use grant type ${TOKEN_EXCHANGE_GRANT_TYPE}`,
      );
    });

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'not authorized to use grant type',
    );
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported subject_token_type', async () => {
    await expect(
      exchangeToken(
        exchangeParams({
          subjectTokenType: 'urn:ietf:params:oauth:token-type:id_token',
        }),
      ),
    ).rejects.toMatchObject({ errorCode: 'invalid_request' });
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('accepts an explicit access-token subject_token_type', async () => {
    const response = await exchangeToken(
      exchangeParams({ subjectTokenType: ACCESS_TOKEN_TYPE }),
    );

    expect(response.access_token).toBe('api-audience-token');
  });

  it('rejects a subject token that fails verification', async () => {
    verifyAccessTokenMock.mockRejectedValue(
      new OAuthError('invalid_grant', 'token verification failed: jwt expired'),
    );

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'token verification failed',
    );
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects a subject token that carries no grant_id', async () => {
    verifyAccessTokenMock.mockResolvedValue({ sub: 'user-1', aud: MCP_URI });

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'token is not bound to an authorization',
    );
    expect(getActiveGrantMock).not.toHaveBeenCalled();
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects when the grant has been revoked', async () => {
    getActiveGrantMock.mockRejectedValue(
      new OAuthError(
        'invalid_grant',
        'the authorization for this client has been revoked',
      ),
    );

    await expect(exchangeToken(exchangeParams())).rejects.toThrow('revoked');
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects when the user is no longer active', async () => {
    userGetMock.mockResolvedValue({
      id: 'user-1',
      status: 'INACTIVE',
      organizationId: 'org-1',
    });

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'no longer active',
    );
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists', async () => {
    userGetMock.mockResolvedValue(null);

    await expect(exchangeToken(exchangeParams())).rejects.toThrow(
      'no longer active',
    );
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects when the user has no access to the project', async () => {
    getForUserMock.mockResolvedValue(null);

    await expect(exchangeToken(exchangeParams())).rejects.toMatchObject({
      errorCode: 'invalid_target',
      description: 'the requested project is not accessible',
    });
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('authorizes the project named by the subject token, per request', async () => {
    await exchangeToken(exchangeParams());

    expect(getForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'project-1',
    );
  });

  it('inherits the project from the subject token, not from the grant', async () => {
    // The exchanged token refers to the subject token's project, not the grant's.
    verifyAccessTokenMock.mockResolvedValue({
      sub: 'user-1',
      aud: MCP_URI,
      client_id: 'client-1',
      scope: 'mcp',
      grant_id: 'grant-1',
      project_id: 'project-2',
    });
    getForUserMock.mockResolvedValue({
      projectId: 'project-2',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });

    await exchangeToken(exchangeParams());

    expect(getForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'project-2',
    );
    expect(mintMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-2' }),
    );
  });

  it('acts in a requested project instead of the subject token one', async () => {
    // How an agent switches project: it names where it wants to act, and this decides.
    getForUserMock.mockResolvedValue({
      projectId: 'project-9',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });

    await exchangeToken(exchangeParams({ requestedProjectId: 'project-9' }));

    expect(getForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'project-9',
    );
    expect(mintMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-9' }),
    );
  });

  it('refuses a requested project the user is not a member of', async () => {
    getForUserMock.mockResolvedValue(null);

    // Without this check a resource server could mint itself a token for any project it
    // cared to name.
    await expect(
      exchangeToken(exchangeParams({ requestedProjectId: 'someone-elses' })),
    ).rejects.toMatchObject({ errorCode: 'invalid_target' });
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('checks membership for the requested project, not the subject token one', async () => {
    getForUserMock.mockResolvedValue({
      projectId: 'project-9',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });

    await exchangeToken(exchangeParams({ requestedProjectId: 'project-9' }));

    // Checking the wrong project would authorize a switch on access to the project being
    // switched away from.
    expect(getForUserMock).not.toHaveBeenCalledWith(
      expect.anything(),
      'project-1',
    );
  });

  it('rejects a subject token that names no project', async () => {
    verifyAccessTokenMock.mockResolvedValue({
      sub: 'user-1',
      aud: MCP_URI,
      client_id: 'client-1',
      scope: 'mcp',
      grant_id: 'grant-1',
    });

    await expect(exchangeToken(exchangeParams())).rejects.toMatchObject({
      errorCode: 'invalid_grant',
    });
    expect(mintMock).not.toHaveBeenCalled();
  });

  it('rejects when no mcp resource is configured', async () => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(undefined);

    await expect(exchangeToken(exchangeParams())).rejects.toMatchObject({
      errorCode: 'invalid_target',
      description: 'the mcp resource is not configured',
    });
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(mintMock).not.toHaveBeenCalled();
  });
});
