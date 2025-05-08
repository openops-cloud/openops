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

  it('Should list step test outputs for given step IDs', async () => {
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

    const stepId1 = openOpsId();
    const stepId2 = openOpsId();

    await flowStepTestOutputService.save({
      stepId: stepId1,
      flowVersionId: mockFlowVersion.id,
      output: { value: 'one' },
    });

    await flowStepTestOutputService.save({
      stepId: stepId2,
      flowVersionId: mockFlowVersion.id,
      output: { value: 'two' },
    });

    const results = await flowStepTestOutputService.list({
      flowVersionId: mockFlowVersion.id,
      stepIds: [stepId1, stepId2],
    });

    expect(results).toHaveLength(2);

    const outputs = results.map((r) => r.output);
    expect(outputs).toEqual(
      expect.arrayContaining([{ value: 'one' }, { value: 'two' }]),
    );
  });
});
