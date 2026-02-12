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

describe('Project Current API', () => {
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
      user: mockUser,
      organization: mockOrganization,
      project: mockProject,
    };
  };

  describe('GET /v1/users/projects/current', () => {
    it('Should return current project from JWT', async () => {
      const { token, project } = await createAndInsertMocks();

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/users/projects/current',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response?.statusCode).toBe(200);
      const responseBody = response?.json();

      expect(responseBody).toMatchObject({
        id: project.id,
        displayName: project.displayName,
        organizationId: project.organizationId,
      });
      expect(responseBody.tablesDatabaseToken).toBeUndefined();
    });

    it('Should return 401 when no authentication', async () => {
      const response = await app?.inject({
        method: 'GET',
        url: '/v1/users/projects/current',
      });

      expect(response?.statusCode).toBe(401);
    });
  });
});
