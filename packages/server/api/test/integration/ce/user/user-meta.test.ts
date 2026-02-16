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

describe('User Meta API', () => {
  const createAndInsertMocks = async (): Promise<{
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

    await databaseConnection().getRepository('user').update(mockUser.id, {
      organizationId: mockOrganization.id,
    });

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save([mockProject]);

    const mockToken = await generateMockToken({
      id: mockUser.id,
      type: PrincipalType.USER,
      projectId: mockProject.id,
      organization: { id: mockOrganization.id },
    });

    return {
      token: mockToken,
      user: { ...mockUser, organizationId: mockOrganization.id },
      organization: mockOrganization,
      project: mockProject,
    };
  };

  describe('GET /v1/users/me', () => {
    it('Should return user meta with projectId', async () => {
      const { token, user, organization, project } =
        await createAndInsertMocks();

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/users/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response?.statusCode).toBe(200);
      const responseBody = response?.json();

      expect(responseBody).toMatchObject({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        organizationRole: user.organizationRole,
        trackEvents: user.trackEvents,
        projectId: project.id,
        projectPermissions: expect.any(Object),
      });
    });

    it('Should return 401 without authentication', async () => {
      const response = await app?.inject({
        method: 'GET',
        url: '/v1/users/me',
      });

      expect(response?.statusCode).toBe(401);
    });
  });
});
