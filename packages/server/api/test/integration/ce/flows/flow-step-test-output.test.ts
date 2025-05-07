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
    expect(results[0].output).toStrictEqual({ value: 'one' });
    expect(results[1].output).toStrictEqual({ value: 'two' });
  });

  it('Should copy all test outputs from one flow version to another', async () => {
    const { mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({ projectId: mockProject.id });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const fromFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      state: FlowVersionState.LOCKED,
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([fromFlowVersion]);

    const toFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      state: FlowVersionState.DRAFT,
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([toFlowVersion]);

    const stepId1 = openOpsId();
    const stepId2 = openOpsId();

    await flowStepTestOutputService.save({
      stepId: stepId1,
      flowVersionId: fromFlowVersion.id,
      output: { value: 'from-1' },
    });

    await flowStepTestOutputService.save({
      stepId: stepId2,
      flowVersionId: fromFlowVersion.id,
      output: { value: 'from-2' },
    });

    await flowStepTestOutputService.copyFromVersion({
      fromVersionId: fromFlowVersion.id,
      toVersionId: toFlowVersion.id,
    });

    const newSaved = await flowStepTestOutputService.list({
      flowVersionId: toFlowVersion.id,
      stepIds: [stepId1, stepId2],
    });

    expect(newSaved[0].output).toStrictEqual({ value: 'from-1' });
    expect(newSaved[1].output).toStrictEqual({ value: 'from-2' });
  });
});
