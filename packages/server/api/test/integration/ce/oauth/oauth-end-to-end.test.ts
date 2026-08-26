/*
 * The whole external-agent flow in one pass: an unknown client registers itself, the user
 * approves it, the code becomes a connection, and the resource server swaps that connection
 * for a token the API accepts.
 *
 * Every step has unit coverage, and `oauth-consumption` covers what happens when a step is
 * replayed or raced. Neither shows that the steps fit together, which is the failure this
 * catches: a claim renamed, an audience that no longer matches, a grant the exchange cannot
 * resolve. `tools/oauth-flow.sh` walked this by hand, and nothing ran it.
 *
 * The boot guard refuses SQLite because the migration is Postgres-only, but this environment
 * synchronises the schema from the entities, so it is stubbed here.
 */
jest.mock('../../../../src/app/oauth/config/oauth-config-validation', () => ({
  validateOAuthConfiguration: jest.fn(),
}));

import { encryptUtils } from '@openops/server-shared';
import { openOpsId, PrincipalType, UserStatus } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

let app: FastifyInstance | null = null;
let userId: string;
let projectId: string;

const REDIRECT_URI = 'http://127.0.0.1:41200/callback';
const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const RS_SECRET = 'r'.repeat(32);
const MCP_RESOURCE = 'http://localhost:3020/mcp';

const OVERRIDES: Record<string, string> = {
  OPS_OAUTH_ENABLED: 'true',
  OPS_OAUTH_ISSUER_URL: 'http://localhost:3000',
  OPS_MCP_RESOURCE_URL: MCP_RESOURCE,
  OPS_OAUTH_RS_CLIENT_SECRET: RS_SECRET,
};

const previousEnv = new Map<string, string | undefined>();
const repo = (table: string) => databaseConnection().getRepository(table);

function claims(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'),
  );
}

async function registerClient(): Promise<string> {
  const response = await app!.inject({
    method: 'POST',
    url: '/v1/oauth/register',
    body: { client_name: 'End To End Client', redirect_uris: [REDIRECT_URI] },
  });

  expect(response.statusCode).toBe(StatusCodes.CREATED);

  return response.json().client_id;
}

async function authorize(clientId: string): Promise<string> {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: CODE_CHALLENGE,
    code_challenge_method: 'S256',
    resource: MCP_RESOURCE,
    scope: 'mcp',
  });

  const response = await app!.inject({
    method: 'GET',
    url: `/v1/oauth/authorize?${query.toString()}`,
  });

  expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);

  const location = new URL(response.headers.location as string);
  const requestId = location.searchParams.get('request_id');

  expect(requestId).toBeTruthy();

  return requestId as string;
}

async function approve(requestId: string): Promise<string> {
  const token = await generateMockToken({
    type: PrincipalType.USER,
    id: userId,
    projectId,
  });

  const response = await app!.inject({
    method: 'POST',
    url: `/v1/oauth/requests/${requestId}/decision`,
    headers: { authorization: `Bearer ${token}`, 'x-openops-consent': '1' },
    body: { approve: true },
  });

  expect(response.statusCode).toBe(StatusCodes.OK);

  const code = new URL(response.json().redirectTo).searchParams.get('code');

  expect(code).toBeTruthy();

  return code as string;
}

async function redeem(
  clientId: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await app!.inject({
    method: 'POST',
    url: '/v1/oauth/token',
    body: {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: CODE_VERIFIER,
      resource: MCP_RESOURCE,
    },
  });

  expect(response.statusCode).toBe(StatusCodes.OK);

  return {
    accessToken: response.json().access_token,
    refreshToken: response.json().refresh_token,
  };
}

function exchange(subjectToken: string, requestedProjectId?: string) {
  return app!.inject({
    method: 'POST',
    url: '/v1/oauth/token',
    headers: {
      authorization: `Basic ${Buffer.from(
        `openops-mcp-rs:${RS_SECRET}`,
      ).toString('base64')}`,
    },
    body: {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: subjectToken,
      ...(requestedProjectId ? { project_id: requestedProjectId } : {}),
    },
  });
}

beforeAll(async () => {
  for (const [key, value] of Object.entries(OVERRIDES)) {
    previousEnv.set(key, process.env[key]);
    process.env[key] = value;
  }

  encryptUtils.loadEncryptionKey();
  await databaseConnection().initialize();
  app = await setupServer();

  const user = createMockUser({
    email: `oauth-e2e-${Date.now()}@openops.com`,
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
  await app?.close();
  await databaseConnection().destroy();

  for (const [key, value] of previousEnv) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
});

describe('the external agent flow, end to end', () => {
  it('carries an unknown client all the way to a token the API accepts', async () => {
    const clientId = await registerClient();
    const requestId = await authorize(clientId);
    const code = await approve(requestId);
    const { accessToken } = await redeem(clientId, code);

    // Addressed to the MCP server, so the API would refuse it.
    expect(claims(accessToken).aud).toBe(MCP_RESOURCE);
    expect(claims(accessToken).project_id).toBe(projectId);

    const exchanged = await exchange(accessToken);

    expect(exchanged.statusCode).toBe(StatusCodes.OK);

    const apiToken = exchanged.json().access_token;

    expect(claims(apiToken).aud).toBe(OVERRIDES.OPS_OAUTH_ISSUER_URL);
    expect(claims(apiToken).project_id).toBe(projectId);

    const used = await app!.inject({
      method: 'GET',
      url: '/v1/flows/',
      headers: { authorization: `Bearer ${apiToken}` },
    });

    expect(used.statusCode).toBe(StatusCodes.OK);
  });

  it('refuses to exchange a token minted for the API itself', async () => {
    const clientId = await registerClient();
    const code = await approve(await authorize(clientId));
    const { accessToken } = await redeem(clientId, code);

    const apiToken = (await exchange(accessToken)).json().access_token;

    // The audience separation is what stops this server laundering one token into another.
    const laundered = await exchange(apiToken);

    expect(laundered.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(laundered.json().error).toBe('invalid_grant');
  });

  it('refuses a project the user does not belong to', async () => {
    const clientId = await registerClient();
    const code = await approve(await authorize(clientId));
    const { accessToken } = await redeem(clientId, code);

    const elsewhere = await exchange(accessToken, openOpsId());

    expect(elsewhere.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(elsewhere.json().error).toBe('invalid_target');
  });

  it('refuses a resource server that cannot prove who it is', async () => {
    const clientId = await registerClient();
    const code = await approve(await authorize(clientId));
    const { accessToken } = await redeem(clientId, code);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/oauth/token',
      headers: {
        authorization: `Basic ${Buffer.from('openops-mcp-rs:wrong').toString(
          'base64',
        )}`,
      },
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: accessToken,
      },
    });

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.json().error).toBe('invalid_client');
});
