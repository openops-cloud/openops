type ClientRow = Record<string, unknown>;

const clientRows: ClientRow[] = [];

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    findOneBy: async (query: { id: string }) =>
      clientRows.find((row) => row.id === query.id) ?? null,
    insert: async (row: ClientRow) => {
      if (clientRows.some((existing) => existing.id === row.id)) {
        const error = new Error('duplicate key') as Error & { code: string };
        error.code = '23505';
        throw error;
      }
      clientRows.push(row);
    },
    update: async (criteria: ClientRow, patch: ClientRow) => {
      const targets = clientRows.filter((row) => row.id === criteria.id);
      for (const target of targets) {
        Object.assign(target, patch);
      }
      return { affected: targets.length };
    },
    save: async (row: ClientRow) => {
      const index = clientRows.findIndex((existing) => existing.id === row.id);
      if (index >= 0) {
        clientRows[index] = { ...clientRows[index], ...row };
        return clientRows[index];
      }
      clientRows.push(row);
      return row;
    },
  }),
}));

import {
  clientsService,
  RS_CLIENT_ID,
  TOKEN_EXCHANGE_GRANT,
} from '../../../src/app/oauth/clients.service';
import { oauthConfig } from '../../../src/app/oauth/oauth-config';
import { sha256Hex } from '../../../src/app/oauth/oauth-crypto';
import { OAuthError } from '../../../src/app/oauth/oauth-errors';
import { OAuthClient } from '../../../src/app/oauth/oauth-model';

const RS_SECRET = 'a'.repeat(48);

const validMetadata = () => ({
  client_name: 'Test MCP Client',
  redirect_uris: ['https://client.example.com/callback'],
});

const basicHeader = (clientId: string, secret: string): string =>
  `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;

const storedRow = (id: string): ClientRow => {
  const row = clientRows.find((candidate) => candidate.id === id);
  if (!row) {
    throw new Error(`expected a stored client row for ${id}`);
  }
  return row;
};

describe('clientsService', () => {
  beforeEach(() => {
    clientRows.length = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerClient', () => {
    it('registers a public client with defaults and no secret', async () => {
      const response = await clientsService.registerClient(validMetadata());

      expect(response.client_id).toEqual(expect.any(String));
      expect(response.client_id.length).toBe(21);
      expect(response.client_name).toBe('Test MCP Client');
      expect(response.redirect_uris).toEqual([
        'https://client.example.com/callback',
      ]);
      expect(response.grant_types).toEqual([
        'authorization_code',
        'refresh_token',
      ]);
      expect(response.token_endpoint_auth_method).toBe('none');
      expect(response.scope).toBe('');
      expect(response.client_id_issued_at).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000),
      );

      expect(JSON.stringify(response)).not.toContain('client_secret');
      expect(
        Object.keys(response).filter((key) => key.includes('secret')),
      ).toEqual([]);

      const row = storedRow(response.client_id);
      expect(row.clientSecretHash).toBeNull();
      expect(row.tokenEndpointAuthMethod).toBe('none');
      expect(row.grantTypes).toEqual(['authorization_code', 'refresh_token']);
      // No client-level usage column: usage is tracked per connection on the grant.
      expect('lastUsedAt' in row).toBe(false);
    });

    it('persists an explicitly requested subset of grant types', async () => {
      const response = await clientsService.registerClient({
        ...validMetadata(),
        grant_types: ['authorization_code'],
        scope: 'mcp',
      });

      expect(response.grant_types).toEqual(['authorization_code']);
      expect(response.scope).toBe('mcp');
      expect(storedRow(response.client_id).grantTypes).toEqual([
        'authorization_code',
      ]);
    });

    it('rejects a missing client_name', async () => {
      await expect(
        clientsService.registerClient({
          redirect_uris: ['https://client.example.com/callback'],
        }),
      ).rejects.toThrow(OAuthError);
      expect(clientRows).toHaveLength(0);
    });

    it('rejects an empty client_name', async () => {
      await expect(
        clientsService.registerClient({ ...validMetadata(), client_name: '' }),
      ).rejects.toThrow('invalid_client_metadata');
    });

    it('rejects a client_name over 128 characters', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          client_name: 'n'.repeat(129),
        }),
      ).rejects.toThrow('invalid_client_metadata');
    });

    it('rejects missing redirect_uris', async () => {
      await expect(
        clientsService.registerClient({ client_name: 'Test MCP Client' }),
      ).rejects.toThrow('invalid_redirect_uri');
    });

    it('rejects an empty redirect_uris array', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          redirect_uris: [],
        }),
      ).rejects.toThrow('invalid_redirect_uri');
    });

    it('rejects more than ten redirect_uris', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          redirect_uris: Array.from(
            { length: 11 },
            (_unused, index) => `https://client.example.com/cb/${index}`,
          ),
        }),
      ).rejects.toThrow('invalid_redirect_uri');
    });

    it('rejects a non-loopback http redirect_uri', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          redirect_uris: ['http://attacker.example.com/callback'],
        }),
      ).rejects.toThrow('invalid_redirect_uri');
      expect(clientRows).toHaveLength(0);
    });

    it('rejects the implicit grant type', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          grant_types: ['implicit'],
        }),
      ).rejects.toThrow('invalid_client_metadata');
    });

    it('rejects a registration that asks for the token-exchange grant', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          grant_types: ['authorization_code', TOKEN_EXCHANGE_GRANT],
        }),
      ).rejects.toThrow('invalid_client_metadata');
      expect(clientRows).toHaveLength(0);
    });

    it('rejects client_secret_basic authentication for a registered client', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          token_endpoint_auth_method: 'client_secret_basic',
        }),
      ).rejects.toThrow('invalid_client_metadata');
      expect(clientRows).toHaveLength(0);
    });

    it('rejects a scope over 128 characters', async () => {
      await expect(
        clientsService.registerClient({
          ...validMetadata(),
          scope: 's'.repeat(129),
        }),
      ).rejects.toThrow('invalid_client_metadata');
    });
  });

  describe('getClient / getClientOrThrow', () => {
    it('returns null for an unknown client and the row for a known one', async () => {
      const registered = await clientsService.registerClient(validMetadata());

      expect(await clientsService.getClient('does-not-exist')).toBeNull();

      const found = await clientsService.getClient(registered.client_id);
      expect(found?.id).toBe(registered.client_id);
      expect(found?.clientName).toBe('Test MCP Client');
    });

    it('throws invalid_client when the client is unknown', async () => {
      await expect(
        clientsService.getClientOrThrow('does-not-exist'),
      ).rejects.toThrow('unknown client');
    });

    it('returns the client when it exists', async () => {
      const registered = await clientsService.registerClient(validMetadata());

      const client = await clientsService.getClientOrThrow(
        registered.client_id,
      );

      expect(client.id).toBe(registered.client_id);
      expect(client.redirectUris).toEqual([
        'https://client.example.com/callback',
      ]);
    });
  });

  describe('assertGrantTypeAllowed', () => {
    const clientWith = (grantTypes: string[]): OAuthClient =>
      ({
        id: 'client-1',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        clientName: 'Test MCP Client',
        redirectUris: ['https://client.example.com/callback'],
        grantTypes,
        tokenEndpointAuthMethod: 'none',
        clientSecretHash: null,
        scope: '',
      } as OAuthClient);

    it('allows a grant type the client registered', () => {
      expect(() =>
        clientsService.assertGrantTypeAllowed(
          clientWith(['authorization_code', 'refresh_token']),
          'refresh_token',
        ),
      ).not.toThrow();
    });

    it('rejects a grant type the client did not register', () => {
      expect(() =>
        clientsService.assertGrantTypeAllowed(
          clientWith(['authorization_code']),
          'refresh_token',
        ),
      ).toThrow('unauthorized_client');
    });

    it('rejects the token-exchange grant for a public client', () => {
      expect(() =>
        clientsService.assertGrantTypeAllowed(
          clientWith(['authorization_code', 'refresh_token']),
          TOKEN_EXCHANGE_GRANT,
        ),
      ).toThrow('unauthorized_client');
    });
  });

  describe('ensureResourceServerClient', () => {
    it('does nothing when no resource server secret is configured', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(undefined);

      await clientsService.ensureResourceServerClient();

      expect(clientRows).toHaveLength(0);
    });

    it('does nothing when the configured secret is an empty string', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue('');

      await clientsService.ensureResourceServerClient();

      expect(clientRows).toHaveLength(0);
    });

    it('fails fast when the configured secret is too short', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue('a'.repeat(31));

      // A configuration fault, reported as one — not as an OAuth protocol error.
      await expect(clientsService.ensureResourceServerClient()).rejects.toThrow(
        'SYSTEM_PROP_INVALID',
      );
      expect(clientRows).toHaveLength(0);
    });

    it('creates the resource server client with only the hashed secret', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(RS_SECRET);

      await clientsService.ensureResourceServerClient();

      expect(clientRows).toHaveLength(1);
      const row = storedRow(RS_CLIENT_ID);
      expect(row.clientName).toBe('OpenOps MCP Resource Server');
      expect(row.redirectUris).toEqual([]);
      expect(row.grantTypes).toEqual([TOKEN_EXCHANGE_GRANT]);
      expect(row.tokenEndpointAuthMethod).toBe('client_secret_basic');
      expect(row.clientSecretHash).toBe(sha256Hex(RS_SECRET));
      expect(row.scope).toBe('mcp');
      expect(JSON.stringify(row)).not.toContain(RS_SECRET);
    });

    it('keeps the row id within the 21-character id column limit', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(RS_SECRET);

      await clientsService.ensureResourceServerClient();

      expect(RS_CLIENT_ID.length).toBeLessThanOrEqual(21);
      expect(String(storedRow(RS_CLIENT_ID).id).length).toBeLessThanOrEqual(21);
    });

    it('is idempotent across repeated boots', async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(RS_SECRET);

      await clientsService.ensureResourceServerClient();
      const created = storedRow(RS_CLIENT_ID).created;
      await clientsService.ensureResourceServerClient();

      expect(clientRows).toHaveLength(1);
      expect(storedRow(RS_CLIENT_ID).created).toBe(created);
      expect(storedRow(RS_CLIENT_ID).clientSecretHash).toBe(
        sha256Hex(RS_SECRET),
      );
    });

    it('updates the stored hash when the configured secret is rotated', async () => {
      const rotatedSecret = 'b'.repeat(48);
      const secretSpy = jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(RS_SECRET);

      await clientsService.ensureResourceServerClient();
      secretSpy.mockReturnValue(rotatedSecret);
      await clientsService.ensureResourceServerClient();

      expect(clientRows).toHaveLength(1);
      expect(storedRow(RS_CLIENT_ID).clientSecretHash).toBe(
        sha256Hex(rotatedSecret),
      );

      await expect(
        clientsService.authenticateResourceServerClient(
          basicHeader(RS_CLIENT_ID, RS_SECRET),
        ),
      ).rejects.toThrow('invalid_client');
      const client = await clientsService.authenticateResourceServerClient(
        basicHeader(RS_CLIENT_ID, rotatedSecret),
      );
      expect(client.id).toBe(RS_CLIENT_ID);
    });
  });

  describe('authenticateResourceServerClient', () => {
    beforeEach(async () => {
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(RS_SECRET);
      await clientsService.ensureResourceServerClient();
    });

    it('authenticates the resource server with correct Basic credentials', async () => {
      const client = await clientsService.authenticateResourceServerClient(
        basicHeader(RS_CLIENT_ID, RS_SECRET),
      );

      expect(client.id).toBe(RS_CLIENT_ID);
      expect(client.grantTypes).toEqual([TOKEN_EXCHANGE_GRANT]);
      expect(client.tokenEndpointAuthMethod).toBe('client_secret_basic');
    });

    it('accepts a lowercase basic scheme', async () => {
      const header = basicHeader(RS_CLIENT_ID, RS_SECRET).replace(
        'Basic ',
        'basic ',
      );

      const client = await clientsService.authenticateResourceServerClient(
        header,
      );

      expect(client.id).toBe(RS_CLIENT_ID);
    });

    it('accepts a secret containing colons and percent-encoding', async () => {
      const secret = 'aaaa:bbbb:cccc dddd/eeee-ffff-gggg-hhhh-iiii-jjjj';
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(secret);
      await clientsService.ensureResourceServerClient();

      const header = `Basic ${Buffer.from(
        `${RS_CLIENT_ID}:${encodeURIComponent(secret)}`,
      ).toString('base64')}`;

      const client = await clientsService.authenticateResourceServerClient(
        header,
      );

      expect(client.id).toBe(RS_CLIENT_ID);
    });

    it('tolerates a malformed percent escape in the secret', async () => {
      const secret = `100%-literal-secret-${'z'.repeat(20)}`;
      jest
        .spyOn(oauthConfig, 'getResourceServerClientSecret')
        .mockReturnValue(secret);
      await clientsService.ensureResourceServerClient();

      const client = await clientsService.authenticateResourceServerClient(
        basicHeader(RS_CLIENT_ID, secret),
      );

      expect(client.id).toBe(RS_CLIENT_ID);
    });

    it('rejects a wrong secret', async () => {
      await expect(
        clientsService.authenticateResourceServerClient(
          basicHeader(RS_CLIENT_ID, 'c'.repeat(48)),
        ),
      ).rejects.toThrow('invalid_client');
    });

    it('rejects a missing Authorization header', async () => {
      await expect(
        clientsService.authenticateResourceServerClient(undefined),
      ).rejects.toThrow('missing client credentials');
    });

    it('rejects a non-Basic Authorization header', async () => {
      await expect(
        clientsService.authenticateResourceServerClient('Bearer some-token'),
      ).rejects.toThrow('missing client credentials');
    });

    it('rejects a public DCR client even when its id is known', async () => {
      const registered = await clientsService.registerClient(validMetadata());

      await expect(
        clientsService.authenticateResourceServerClient(
          basicHeader(registered.client_id, RS_SECRET),
        ),
      ).rejects.toThrow('invalid_client');
    });

    it('does not reveal whether the client id or the secret was wrong', async () => {
      const unknownClient = await clientsService
        .authenticateResourceServerClient(
          basicHeader('unknown-client', RS_SECRET),
        )
        .catch((error: OAuthError) => error);
      const wrongSecret = await clientsService
        .authenticateResourceServerClient(
          basicHeader(RS_CLIENT_ID, 'c'.repeat(48)),
        )
        .catch((error: OAuthError) => error);

      expect(unknownClient).toBeInstanceOf(OAuthError);
      expect(wrongSecret).toBeInstanceOf(OAuthError);
      expect((unknownClient as OAuthError).errorCode).toBe('invalid_client');
      expect((unknownClient as OAuthError).statusCode).toBe(401);
      expect((unknownClient as OAuthError).description).toBe(
        (wrongSecret as OAuthError).description,
      );
      expect((unknownClient as OAuthError).description).not.toContain(
        RS_CLIENT_ID,
      );
      expect((unknownClient as OAuthError).description).not.toMatch(
        /unknown|not found|secret|password/i,
      );
    });
  });
});
