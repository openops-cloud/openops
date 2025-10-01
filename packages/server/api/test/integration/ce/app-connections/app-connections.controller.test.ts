import { encryptUtils } from '@openops/server-shared';
import {
  AppConnectionStatus,
  AppConnectionType,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
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

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('App Connections API', () => {
  describe('GET /v1/app-connections/by-name/:name', () => {
    it('Returns connection by name with secrets redacted', async () => {
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

      const authProviderKey = 'basic-auth-test-provider';

      const connectionId = openOpsId();
      const connectionName = 'my-test-connection';
      const rawValue = {
        type: AppConnectionType.BASIC_AUTH,
        username: 'user123',
        password: 'super-secret',
      } as const;

      await databaseConnection()
        .getRepository('app_connection')
        .save({
          id: connectionId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          name: connectionName,
          type: AppConnectionType.BASIC_AUTH,
          status: AppConnectionStatus.ACTIVE,
          projectId: mockProject.id,
          value: encryptUtils.encryptObject(rawValue),
          authProviderKey,
        });

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/app-connections/by-name/${connectionName}`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const body = response?.json();

      expect(body?.id).toBe(connectionId);
      expect(body?.name).toBe(connectionName);
      expect(body?.projectId).toBe(mockProject.id);
      expect(body?.authProviderKey).toBe(authProviderKey);
      expect(body?.type).toBe(AppConnectionType.BASIC_AUTH);
      expect(body?.status).toBe(AppConnectionStatus.ACTIVE);
      expect(body?.value).toBeDefined();
      expect(body?.value?.username).toBe('user123');
      expect(body?.value?.password).toBe('**REDACTED**');
    });

    it('Returns 404 when connection does not exist', async () => {
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
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/app-connections/by-name/non-existent-conn`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });
});
