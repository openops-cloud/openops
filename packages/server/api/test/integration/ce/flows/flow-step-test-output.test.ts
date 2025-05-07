import { FlowVersionState, openOpsId } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { flowStepTestOutputService } from '../../../../src/app/flows/step-test-output/flow-step-test-output.service';
import { setupServer } from '../../../../src/app/server';
import {
  createMockFlow,
  createMockFlowVersion,
  mockBasicSetup,
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

describe('Flow Step Test output', () => {
  it('Should save step test output', async () => {
    const { mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({
      projectId: mockProject.id,
    });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const mockFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      state: FlowVersionState.DRAFT,
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([mockFlowVersion]);

    const savedData = await flowStepTestOutputService.save({
      stepId: openOpsId(),
      flowVersionId: mockFlowVersion.id,
      output: {
        test: 'test',
      },
    });

    const stepTestOutput = await databaseConnection()
      .getRepository('flow_step_test_output')
      .findOneByOrFail({
        id: savedData.id,
      });

    expect(Buffer.isBuffer(stepTestOutput.output)).toBe(true);
  });
});
