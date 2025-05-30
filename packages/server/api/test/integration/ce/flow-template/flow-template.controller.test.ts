import {
  FlowTemplateDto,
  openOpsId,
  PrincipalType,
  TemplateType,
  TriggerType,
} from '@openops/shared';
import { FastifyInstance, LightMyRequestResponse } from 'fastify';
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

describe('Flow templates API', () => {
  const projectId = openOpsId();
  const organizationId = openOpsId();
  let testToken: string;
  const templateId = openOpsId();

  beforeEach(async () => {
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

    const mockTemplate: FlowTemplateDto = {
      id: templateId,
      name: 'test-template',
      description: 'A test template',
      projectId,
      organizationId,
      services: ['ECS', 'EC2'],
      template: {
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
      },
      domains: ['FinOps'],
      tags: ['test'],
      type: TemplateType.PROJECT,
      blocks: ['test-block'],
      updated: new Date().toISOString(),
      created: new Date().toISOString(),
      categories: ['test-category'],
    };
    await databaseConnection()
      .getRepository('flow_template')
      .save(mockTemplate);
    testToken = await generateMockToken({
      type: PrincipalType.USER,
      id: mockUser.id,
      projectId,
    });
  });

  describe('GET /flow-templates', () => {
    it('should return the flow template', async () => {
      const response = await makeGetRequest(testToken);
      expect(response?.statusCode).toBe(200);
      const templates = response?.json();

      expect(templates).toHaveLength(1);
      expect(templates[0].domains).toStrictEqual(['FinOps']);
      expect(templates[0].template).toBeUndefined();
    });
  });

  describe('GET /flow-templates/:id', () => {
    it('should return the flow template by ID', async () => {
      const response = await makeGetRequest(testToken, '/' + templateId);
      expect(response?.statusCode).toBe(200);
      const templates = response?.json();

      expect(templates.domains).toStrictEqual(['FinOps']);
      expect(templates.template).not.toBeUndefined();
    });
  });
});

function makeGetRequest(
  testToken: string,
  path = '',
): Promise<LightMyRequestResponse> | undefined {
  return app?.inject({
    method: 'GET',
    url: `/v1/flow-templates` + path,
    headers: {
      authorization: `Bearer ${testToken}`,
    },
  });
}
