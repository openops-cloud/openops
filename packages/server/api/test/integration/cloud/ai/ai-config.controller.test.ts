import { AiConfig } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

describe('POST /v1/ai-config', () => {
  let app: FastifyInstance;
  const projectId = openOpsId();
  const organizationId = openOpsId();
  let testToken: string;

  beforeAll(async () => {
    app = await setupServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const mockUser = createMockUser({ organizationId });
    await databaseConnection().getRepository('user').save(mockUser);

    const mockOrganization = createMockOrganization({
      id: organizationId,
      ownerId: mockUser.id,
    });
    await databaseConnection()
      .getRepository('organization')
      .save(mockOrganization);

    const mockProject = createMockProject({
      id: projectId,
      ownerId: mockUser.id,
      organizationId,
    });
    await databaseConnection().getRepository('project').save(mockProject);

    testToken = await generateMockToken({
      type: PrincipalType.USER,
      id: mockUser.id,
      projectId,
    });
  });

  const mockPrincipal = {
    id: 'user-123',
    projectId: 'project-abc',
  };

  const mockAiConfig: AiConfig = {
    id: 'config-001',
    projectId: mockPrincipal.projectId,
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'sk-secret-key',
    modelSettings: { temperature: 0.7 },
    enabled: true,
    created: 'created',
    updated: 'updated',
  };

  const makeRequest = (body = {}) => {
    return app?.inject({
      method: 'POST',
      url: '/v1/ai/config',
      payload: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-secret-key',
        modelSettings: { temperature: 0.7 },
        enabled: true,
        ...body,
      },
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    });
  };

  test('should upsert and return ai config with status 201', async () => {
    await databaseConnection().getRepository('flow_template').save(mockUpsert);

    const response = await makeRequest();

    expect(response.statusCode).toBe(StatusCodes.CREATED);
    expect(response.json()).toEqual(mockAiConfig);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockPrincipal.projectId,
        userId: mockPrincipal.id,
        request: expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'sk-secret-key',
          modelSettings: { temperature: 0.7 },
          enabled: true,
        }),
      }),
    );
  });

  test('should return 500 if service throws', async () => {
    upsertMock.mockRejectedValueOnce(new Error('DB error'));

    const response = await makeRequest();

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.json()).toMatchObject({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
    });
  });
});
