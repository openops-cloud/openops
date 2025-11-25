import { encryptUtils } from '@openops/server-shared';
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
  encryptUtils.loadEncryptionKey();
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
    input: unknown,
    output: unknown,
  ) =>
    flowStepTestOutputService.save({
      stepId,
      flowVersionId: versionId,
      output,
      input,
      success: true,
    });

  it('Should save step test output', async () => {
    const { mockFlowVersion } = await saveFlowAndVersion();

    const savedData = await saveTestOutput(
      openOpsId(),
      mockFlowVersion.id,
      'input',
      {
        test: 'test',
      },
    );

    const savedRaw = await databaseConnection()
      .getRepository('flow_step_test_output')
      .findOneByOrFail({ id: savedData.id });

    expect(savedRaw.output).toEqual(
      expect.objectContaining({
        iv: expect.any(String),
        data: expect.any(String),
      }),
    );
  });

  it('Should list step test outputs for given step IDs', async () => {
    const { mockFlowVersion } = await saveFlowAndVersion();

    const stepId1 = openOpsId();
    const stepId2 = openOpsId();

    await saveTestOutput(
      stepId1,
      mockFlowVersion.id,
      { input: 'one' },
      { value: 'one' },
    );
    await saveTestOutput(
      stepId2,
      mockFlowVersion.id,
      { input: 'two' },
      { value: 'two' },
    );

    const results = await flowStepTestOutputService.listDecrypted({
      flowVersionId: mockFlowVersion.id,
      stepIds: [stepId1, stepId2],
    });

    expect(results).toHaveLength(2);

    const inputs = results.map((r) => r.input);
    expect(inputs).toEqual(
      expect.arrayContaining([{ input: 'one' }, { input: 'two' }]),
    );

    const outputs = results.map((r) => r.output);
    expect(outputs).toEqual(
      expect.arrayContaining([{ value: 'one' }, { value: 'two' }]),
    );
  });

  it('Should return only available outputs and skip step IDs without saved output', async () => {
    const { mockFlowVersion } = await saveFlowAndVersion();

    const existingStepId = openOpsId();
    const missingStepId = openOpsId();

    await saveTestOutput(
      existingStepId,
      mockFlowVersion.id,
      {
        input: 'existing',
      },
      {
        value: 'existing',
      },
    );

    const results = await flowStepTestOutputService.listDecrypted({
      flowVersionId: mockFlowVersion.id,
      stepIds: [existingStepId, missingStepId],
    });

    expect(results).toHaveLength(1);
    expect(results[0].stepId).toBe(existingStepId);
    expect(results[0].input).toStrictEqual({ input: 'existing' });
    expect(results[0].output).toStrictEqual({ value: 'existing' });
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

    await saveTestOutput(
      stepId1,
      fromVersion.id,
      { input: 'from-1' },
      { value: 'from-1' },
    );
    await saveTestOutput(
      stepId2,
      fromVersion.id,
      { input: 'from-2' },
      { value: 'from-2' },
    );

    await flowStepTestOutputService.copyFromVersion({
      fromVersionId: fromVersion.id,
      toVersionId: toVersion.id,
    });

    const copied = await flowStepTestOutputService.listDecrypted({
      flowVersionId: toVersion.id,
      stepIds: [stepId1, stepId2],
    });

    const inputs = copied.map((c) => c.input);
    expect(inputs).toEqual(
      expect.arrayContaining([{ input: 'from-1' }, { input: 'from-2' }]),
    );

    const outputs = copied.map((c) => c.output);
    expect(outputs).toEqual(
      expect.arrayContaining([{ value: 'from-1' }, { value: 'from-2' }]),
    );
  });
});
