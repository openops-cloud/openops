import { Organization, PrincipalType, Project, User } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('User Settings API', () => {
  const mockRequest = {
    setting1: 'value1',
    setting2: 'value2',
  };

  const createAndInsertMocks = async ({
    insertUserSettings = false,
  }): Promise<{
    token: string;
    user: User;
    organization: Organization;
    project: Project;
  }> => {
    const mockUser = createMockUser();
    await databaseConnection().getRepository('user').save([mockUser]);

    const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
    await databaseConnection()
      .getRepository('organization')
      .save(mockOrganization);

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save([mockProject]);

    if (insertUserSettings) {
      const mockUserSettings = {
        id: '1',
        userId: mockUser.id,
        projectId: mockProject.id,
        organizationId: mockOrganization.id,
        settings: {
          setting1: 'value1',
          setting2: 'value2',
        },
      };
      await databaseConnection()
        .getRepository('user_settings')
        .save([mockUserSettings]);
    }

    const mockToken = await generateMockToken({
      id: mockUser.id,
      type: PrincipalType.USER,
      projectId: mockProject.id,
      organization: { id: mockOrganization.id, role: 'MEMBER' },
    });

    return {
      token: mockToken,
      user: mockUser,
      organization: mockOrganization,
      project: mockProject,
    };
  };

  const makeRequest = async ({
    method,
    url = '/v1/users/me/settings',
    token,
    body = {},
  }: {
    method: 'GET' | 'PUT';
    url?: string;
    token?: string;
    body?: Record<string, unknown>;
  }) =>
    app?.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body,
    });

  describe('GET', () => {
    it('When no user settings exist, should return 404', async () => {
      const { token } = await createAndInsertMocks({
        insertUserSettings: false,
      });

      const response = await makeRequest({
        method: 'GET',
        token,
      });

      expect(response?.statusCode).toBe(404);
    });

    it('Should get user settings', async () => {
      const { token } = await createAndInsertMocks({
        insertUserSettings: true,
      });

      const response = await makeRequest({
        method: 'GET',
        token,
      });

      expect(response?.statusCode).toBe(200);
      const responseBody = response?.json();

      expect(responseBody).toEqual(mockRequest);
    });
  });

  describe('PUT', () => {
    it('When settings are not provided, should return 400', async () => {
      const { token } = await createAndInsertMocks({
        insertUserSettings: false,
      });

      const response = await makeRequest({
        method: 'PUT',
        token,
        body: {},
      });

      expect(response?.statusCode).toBe(400);
    });

    it('Shout create user settings', async () => {
      const { token } = await createAndInsertMocks({
        insertUserSettings: false,
      });

      const response = await makeRequest({
        method: 'PUT',
        token,
        body: mockRequest,
      });

      expect(response?.statusCode).toBe(200);
      const responseBody = response?.json();

      expect(responseBody).toEqual(mockRequest);
    });

    it('Shout update user settings', async () => {
      const { token } = await createAndInsertMocks({
        insertUserSettings: true,
      });

      const mockRequest = {
        setting1: 'updated',
        setting2: 'updated',
      };

      const response = await makeRequest({
        method: 'PUT',
        token,
        body: mockRequest,
      });

      expect(response?.statusCode).toBe(200);
      const responseBody = response?.json();
      expect(responseBody).toEqual(mockRequest);
    });
  });
});
