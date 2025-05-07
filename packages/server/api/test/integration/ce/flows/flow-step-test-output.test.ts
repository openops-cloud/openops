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
  const saveFlowAndVersion = async (
    state: FlowVersionState = FlowVersionState.DRAFT,
  ) => {
    const { mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({ projectId: mockProject.id });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const mockFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      state,
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([mockFlowVersion]);

    return { mockFlow, mockFlowVersion };
  };

  const saveTestOutput = async (
    stepId: string,
    versionId: string,
    value: unknown,
  ) =>
    flowStepTestOutputService.save({
      stepId,
      flowVersionId: versionId,
      output: value,
    });

  it('Should save step test output', async () => {
    const { mockFlowVersion } = await saveFlowAndVersion();

    const savedData = await saveTestOutput(openOpsId(), mockFlowVersion.id, {
      test: 'test',
    });

    const savedRaw = await databaseConnection()
      .getRepository('flow_step_test_output')
      .findOneByOrFail({ id: savedData.id });

    expect(Buffer.isBuffer(savedRaw.output)).toBe(true);
  });

  it('Should list step test outputs for given step IDs', async () => {
    const { mockFlowVersion } = await saveFlowAndVersion();

    const stepId1 = openOpsId();
    const stepId2 = openOpsId();

    await saveTestOutput(stepId1, mockFlowVersion.id, { value: 'one' });
    await saveTestOutput(stepId2, mockFlowVersion.id, { value: 'two' });

    const results = await flowStepTestOutputService.list({
      flowVersionId: mockFlowVersion.id,
      stepIds: [stepId1, stepId2],
    });

    expect(results).toHaveLength(2);
    expect(results[0].output).toStrictEqual({ value: 'one' });
    expect(results[1].output).toStrictEqual({ value: 'two' });
  });

  it('Should copy all test outputs from one flow version to another', async () => {
    const { mockFlowVersion: fromVersion } = await saveFlowAndVersion(
      FlowVersionState.LOCKED,
    );
    const { mockFlowVersion: toVersion } = await saveFlowAndVersion(
      FlowVersionState.DRAFT,
    );

    const stepId1 = openOpsId();
    const stepId2 = openOpsId();

    await saveTestOutput(stepId1, fromVersion.id, { value: 'from-1' });
    await saveTestOutput(stepId2, fromVersion.id, { value: 'from-2' });

    await flowStepTestOutputService.copyFromVersion({
      fromVersionId: fromVersion.id,
      toVersionId: toVersion.id,
    });

    const copied = await flowStepTestOutputService.list({
      flowVersionId: toVersion.id,
      stepIds: [stepId1, stepId2],
    });

    expect(copied[0].output).toStrictEqual({ value: 'from-1' });
    expect(copied[1].output).toStrictEqual({ value: 'from-2' });
  });
});
