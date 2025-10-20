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
  getAiTelemetrySDK: jest.fn().mockReturnValue(undefined),
}));

import { faker } from '@faker-js/faker';

import { UserStatus } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';
import { createMockSignInRequest } from '../../../helpers/mocks/authn';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await databaseConnection().getRepository('flag').delete({});
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Sign in Endpoint', () => {
  it('Logs in existing users', async () => {
    const mockEmail = faker.internet.email();
    const mockPassword = 'password';

    const mockUser = createMockUser({
      email: mockEmail,
      password: mockPassword,
      verified: true,
      status: UserStatus.ACTIVE,
    });
    await databaseConnection().getRepository('user').save(mockUser);

    const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
    await databaseConnection()
      .getRepository('organization')
      .save(mockOrganization);

    await databaseConnection().getRepository('user').update(mockUser.id, {
      organizationId: mockOrganization.id,
    });

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save(mockProject);

    const mockSignInRequest = createMockSignInRequest({
      email: mockEmail,
      password: mockPassword,
    });

    const response = await app?.inject({
      method: 'POST',
      url: '/v1/authentication/sign-in',
      body: mockSignInRequest,
      headers: {
        origin: 'http://localhost:4200',
      },
    });

    const responseBody = response?.json();

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(responseBody?.id).toBe(mockUser.id);
    expect(responseBody?.email).toBe(mockEmail);
    expect(responseBody?.firstName).toBe(mockUser.firstName);
    expect(responseBody?.lastName).toBe(mockUser.lastName);
    expect(responseBody?.trackEvents).toBe(mockUser.trackEvents);
    expect(responseBody?.newsLetter).toBe(mockUser.newsLetter);
    expect(responseBody?.password).toBeUndefined();
    expect(responseBody?.status).toBe(mockUser.status);
    expect(responseBody?.verified).toBe(mockUser.verified);
    expect(responseBody?.organizationId).toBe(mockOrganization.id);
    expect(responseBody?.externalId).toBe(null);
    expect(responseBody?.projectId).toBe(mockProject.id);
    expect(responseBody?.token).toBeDefined();
    expect(authUserMock).toBeCalledTimes(1);
  });

  it("Fails if password doesn't match", async () => {
    const mockEmail = faker.internet.email();
    const mockPassword = 'password';

    const mockUser = createMockUser({
      email: mockEmail,
      password: mockPassword,
      verified: true,
      status: UserStatus.ACTIVE,
    });
    await databaseConnection().getRepository('user').save(mockUser);

    const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
    await databaseConnection()
      .getRepository('organization')
      .save(mockOrganization);

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save(mockProject);

    const mockSignInRequest = createMockSignInRequest({
      email: mockEmail,
      password: 'wrong password',
    });

    const response = await app?.inject({
      method: 'POST',
      url: '/v1/authentication/sign-in',
      body: mockSignInRequest,
      headers: {
        origin: 'http://localhost:4200',
      },
    });

    expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    const responseBody = response?.json();
    expect(responseBody?.code).toBe('INVALID_CREDENTIALS');
  });
});
