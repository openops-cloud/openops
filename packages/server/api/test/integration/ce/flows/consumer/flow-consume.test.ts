import { fileCompressor } from '@openops/server-shared';
import {
  ActionType,
  BlockType,
  ExecutionType,
  FlowRunStatus,
  FlowStatus,
  FlowVersionState,
  PackageType,
  ProgressUpdateType,
  RunEnvironment,
  TriggerType,
} from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { flowJobExecutor } from 'server-worker';
import { accessTokenManager } from '../../../../../src/app/authentication/lib/access-token-manager';
import { databaseConnection } from '../../../../../src/app/database/database-connection';
import { setupServer } from '../../../../../src/app/server';
import {
  createMockFlow,
  createMockFlowRun,
  createMockFlowVersion,
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
  await app.listen({
    host: '0.0.0.0',
    port: 3000,
  });
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('flow execution', () => {
  it.skip('should execute simple flow with code and block', async () => {
    const mockUser = createMockUser();
    await databaseConnection().getRepository('user').save([mockUser]);

    const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
    await databaseConnection()
      .getRepository('organization')
      .save([mockOrganization]);

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save([mockProject]);

    const mockFlow = createMockFlow({
      projectId: mockProject.id,
      status: FlowStatus.ENABLED,
    });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const mockFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      updatedBy: mockUser.id,
      state: FlowVersionState.LOCKED,
      trigger: {
        type: TriggerType.BLOCK,
        settings: {
          blockName: '@openops/block-schedule',
          blockVersion: '0.1.0',
          input: {
            run_on_weekends: false,
          },
          triggerName: 'everyHourTrigger',
          blockType: BlockType.OFFICIAL,
          packageType: PackageType.REGISTRY,
          inputUiInfo: {},
        },
        valid: true,
        name: 'webhook',
        displayName: 'Webhook',
        nextAction: {
          name: 'echo_step',
          displayName: 'Echo Step',
          type: ActionType.CODE,
          settings: {
            inputUiInfo: {},
            input: {
              key: '{{ 1 + 2 }}',
            },
            sourceCode: {
              packageJson: '{}',
              code: `
                            export const code = async (inputs) => {
                                return inputs;
                              };
                            `,
            },
          },
          nextAction: {
            name: 'buildArn',
            displayName: 'buildArn',
            type: ActionType.BLOCK,
            settings: {
              inputUiInfo: {},
              blockName: '@openops/block-aws',
              blockVersion: '0.3.0',
              packageType: 'REGISTRY',
              blockType: 'OFFICIAL',
              actionName: 'build_arn',
              input: {
                service: 's3',
                region: 'us-east-1',
                accountId: '123456789012',
                resourceId: 'mybucket/myobject',
              },
            },
            valid: true,
          },
          valid: true,
        },
      },
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([mockFlowVersion]);

    const mockFlowRun = createMockFlowRun({
      flowVersionId: mockFlowVersion.id,
      projectId: mockProject.id,
      flowId: mockFlow.id,
      status: FlowRunStatus.RUNNING,
    });
    await databaseConnection().getRepository('flow_run').save([mockFlowRun]);

    const engineToken = await accessTokenManager.generateEngineToken({
      projectId: mockProject.id,
    });
    const executionCorrelationId = nanoid();
    await flowJobExecutor.executeFlow(
      {
        flowVersionId: mockFlowVersion.id,
        projectId: mockProject.id,
        environment: RunEnvironment.PRODUCTION,
        runId: mockFlowRun.id,
        payload: {},
        synchronousHandlerId: null,
        progressUpdateType: ProgressUpdateType.NONE,
        executionType: ExecutionType.BEGIN,
        executionCorrelationId,
      },
      engineToken,
    );

    const flowRun = await databaseConnection()
      .getRepository('flow_run')
      .findOneByOrFail({
        id: mockFlowRun.id,
      });
    expect(flowRun.status).toEqual(FlowRunStatus.SUCCEEDED);

    const file = await databaseConnection()
      .getRepository('file')
      .findOneByOrFail({
        id: flowRun.logsFileId,
      });
    const decompressedData = await fileCompressor.decompress({
      data: file.data,
      compression: file.compression,
    });
    expect(
      JSON.parse(decompressedData.toString('utf-8')).executionState,
    ).toEqual({
      steps: {
        webhook: {
          type: 'TRIGGER',
          status: 'SUCCEEDED',
          input: {},
          output: {},
        },
        echo_step: {
          type: 'CODE',
          status: 'SUCCEEDED',
          input: {
            key: 3,
          },
          output: {
            key: 3,
          },
          duration: expect.any(Number),
        },
        buildArn: {
          type: 'BLOCK',
          status: 'SUCCEEDED',
          input: {
            service: 's3',
            region: 'us-east-1',
            accountId: '123456789012',
            resourceId: 'mybucket/myobject',
          },
          output: 'arn:aws:s3:us-east-1:123456789012:mybucket/myobject',
          duration: expect.any(Number),
        },
      },
    });
  }, 60000);
});
