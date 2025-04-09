import { accessTokenManager } from '../../../../src/app/authentication/lib/access-token-manager';

const authUserMock = jest.fn().mockResolvedValue({
  token: 'token',
  refresh_token: 'refresh_token',
});

const jwtDecodeMock = jest.fn();
jwtDecodeMock.mockReturnValue({ exp: 1234567890 });
jest.mock('jwt-decode', () => ({
  jwtDecode: jwtDecodeMock,
}));

jest.mock('@openops/common', () => ({
  authenticateUserInOpenOpsTables: authUserMock,
  authenticateDefaultUserInOpenOpsTables: authUserMock,
}));

jest.mock('../../../../src/app/openops-tables/index', () => ({
  openopsTables: {
    createUser: jest.fn().mockResolvedValue({
      token: 'token',
      refresh_token: 'refresh_token',
    }),
    addUserToWorkspace: jest.fn(),
    createDatabase: jest.fn(),
    createTable: jest.fn(),
    createWorkspace: jest.fn(),
    addFieldsToOpenopsDefaultTable: jest.fn(),
    createDefaultWorkspaceAndDatabase: jest.fn().mockResolvedValue({
      workspaceId: '1',
      databaseId: '1',
    }),
  },
}));

import { PrincipalType, UserStatus } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { authenticationService } from '../../../../src/app/authentication/authentication-service';
import { Provider } from '../../../../src/app/authentication/authentication-service/hooks/authentication-service-hooks';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';
import { createMockSignUpRequest } from '../../../helpers/mocks/authn';

let app: FastifyInstance | null = null;
let adminToken: string;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();

  const adminEmail = 'local-admin@openops.com';
  const adminPassword = 'password';
  const mockAdminUser = createMockUser({
    email: adminEmail,
    password: adminPassword,
    verified: true,
    status: UserStatus.ACTIVE,
  });
  await databaseConnection().getRepository('user').save(mockAdminUser);

  const mockOrganization = createMockOrganization({
    ownerId: mockAdminUser.id,
  });
  await databaseConnection()
    .getRepository('organization')
    .save(mockOrganization);

  await databaseConnection().getRepository('user').update(mockAdminUser.id, {
    organizationId: mockOrganization.id,
  });

  const mockProject = createMockProject({
    ownerId: mockAdminUser.id,
    organizationId: mockOrganization.id,
  });
  await databaseConnection().getRepository('project').save(mockProject);

  adminToken = await accessTokenManager.generateToken({
    id: mockAdminUser.id,
    type: PrincipalType.USER,
    projectId: mockProject.id,
    organization: {
      id: mockOrganization.id,
    },
  });
});

beforeEach(async () => {
  jest.clearAllMocks();
  await databaseConnection().getRepository('flag').delete({});
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Sign up Endpoint', () => {
  it('Adds new user', async () => {
    const mockSignUpRequest = createMockSignUpRequest();

    const response = await app?.inject({
      method: 'POST',
      url: '/v1/authentication/sign-up',
      body: mockSignUpRequest,
      headers: {
        origin: 'http://localhost:4200',
        authorization: `Bearer ${adminToken}`,
      },
    });

    const responseBody = response?.json();

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(responseBody?.id).toHaveLength(21);
    expect(responseBody?.created).toBeDefined();
    expect(responseBody?.updated).toBeDefined();
    expect(responseBody?.verified).toBe(true);
    expect(responseBody?.email).toBe(mockSignUpRequest.email);
    expect(responseBody?.firstName).toBe(mockSignUpRequest.firstName);
    expect(responseBody?.lastName).toBe(mockSignUpRequest.lastName);
    expect(responseBody?.trackEvents).toBe(mockSignUpRequest.trackEvents);
    expect(responseBody?.newsLetter).toBe(mockSignUpRequest.newsLetter);
    expect(responseBody?.password).toBeUndefined();
    expect(responseBody?.status).toBe('ACTIVE');
    expect(responseBody?.organizationId).toBeDefined();
    expect(responseBody?.externalId).toBe(null);
    expect(responseBody?.projectId).toHaveLength(21);
    expect(responseBody?.token).toBeDefined();
    expect(authUserMock).toBeCalledTimes(1);
  });

  it('Fails as the request was not made by the admin', async () => {
    const mockSignUpRequest = createMockSignUpRequest();
    const testToken = await generateMockToken({
      type: PrincipalType.USER,
      id: '11',
    });

    const response = await app?.inject({
      method: 'POST',
      url: '/v1/authentication/sign-up',
      body: mockSignUpRequest,
      headers: {
        origin: 'http://localhost:4200',
        authorization: `Bearer ${testToken}`,
      },
    });

    const responseBody = response?.json();

    expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect(responseBody.message).toBe(
      'Adding new users only allowed to admin user.',
    );
  });

  it('Fails as the request was not made with the right PrincipalType', async () => {
    const mockSignUpRequest = createMockSignUpRequest();
    const testToken = await generateMockToken({
      type: PrincipalType.WORKER,
      id: '1',
    });

    const response = await app?.inject({
      method: 'POST',
      url: '/v1/authentication/sign-up',
      body: mockSignUpRequest,
      headers: {
        origin: 'http://localhost:4200',
        authorization: `Bearer ${testToken}`,
      },
    });

    const responseBody = response?.json();

    expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect(responseBody.params.message).toBe(
      'invalid route for principal type',
    );
  });
});
