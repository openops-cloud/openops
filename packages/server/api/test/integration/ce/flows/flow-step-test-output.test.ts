import {
  FlowVersionState,
  openOpsId,
} from '@openops/shared';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { flowStepTestOutputService } from '../../../../src/app/flows/step-test-output/flow-step-test-output.service';
import {
  createMockFlow,
  createMockFlowVersion,
  mockBasicSetup,
} from '../../../helpers/mocks';

beforeAll(async () => {
  await databaseConnection().initialize();
});

afterAll(async () => {
  await databaseConnection().destroy();
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
      outputId: openOpsId(),
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
