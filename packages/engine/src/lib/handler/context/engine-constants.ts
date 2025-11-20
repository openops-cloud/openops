import {
  EncryptedObject,
  ExecuteFlowOperation,
  ExecutePropsOptions,
  ExecuteStepOperation,
  ExecuteTriggerOperation,
  ExecutionType,
  FlowVersionState,
  openOpsId,
  ProgressUpdateType,
  Project,
  ProjectId,
  ResumePayload,
  TestRunLimitSettings,
  TriggerHookType,
} from '@openops/shared';
import {
  createPropsResolver,
  PropsResolver,
} from '../../variables/props-resolver';

type RetryConstants = {
  maxAttempts: number;
  retryExponential: number;
  retryInterval: number;
};

const DEFAULT_RETRY_CONSTANTS: RetryConstants = {
  maxAttempts: 4,
  retryExponential: 2,
  retryInterval: 2000,
};

export class EngineConstants {
  public static readonly BASE_CODE_DIRECTORY =
    process.env.OPS_BASE_CODE_DIRECTORY ?? './cache/codes';
  public static readonly INPUT_FILE = './input.json';
  public static readonly OUTPUT_FILE = './output.json';
  public static readonly BLOCK_SOURCES =
    process.env.OPS_BLOCKS_SOURCE ?? 'FILE';

  private project: Project | null = null;

  public get baseCodeDirectory(): string {
    return EngineConstants.BASE_CODE_DIRECTORY;
  }

  public get blocksSource(): string {
    return EngineConstants.BLOCK_SOURCES;
  }

  public constructor(
    public readonly executionCorrelationId: string | null,
    public readonly flowId: string,
    public readonly flowName: string,
    public readonly flowVersionId: string,
    public readonly flowVersionState: FlowVersionState,
    public readonly flowRunId: string,
    public readonly publicUrl: string,
    public readonly internalApiUrl: string,
    public readonly retryConstants: RetryConstants,
    public readonly engineToken: string,
    public readonly projectId: ProjectId,
    public readonly propsResolver: PropsResolver,
    public readonly testSingleStepMode: boolean,
    public readonly filesServiceType: 'local' | 'db',
    public readonly progressUpdateType: ProgressUpdateType,
    public readonly serverHandlerId: string | null,
    public readonly testRunActionLimits: TestRunLimitSettings,
    public readonly isTestRun: boolean,
    public readonly tablesDatabaseId: number,
    public readonly tablesDatabaseToken: EncryptedObject,
    public readonly resumePayload?: ResumePayload,
  ) {}

  public static async fromExecuteFlowInput(
    input: ExecuteFlowOperation,
  ): Promise<EngineConstants> {
    const project = await EngineConstants.fetchProject(
      input.internalApiUrl,
      input.engineToken,
    );

    return new EngineConstants(
      input.executionCorrelationId,
      input.flowVersion.flowId,
      input.flowVersion.displayName,
      input.flowVersion.id,
      input.flowVersion.state,
      input.flowRunId,
      addTrailingSlashIfMissing(input.publicUrl),
      addTrailingSlashIfMissing(input.internalApiUrl),
      DEFAULT_RETRY_CONSTANTS,
      input.engineToken,
      input.projectId,
      createPropsResolver({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: input.internalApiUrl,
      }),
      false,
      'local',
      input.progressUpdateType,
      input.serverHandlerId ?? null,
      input.flowVersion.testRunActionLimits,
      input.runEnvironment === 'TESTING',
      project.tablesDatabaseId,
      project.tablesDatabaseToken,
      input.executionType === ExecutionType.RESUME
        ? input.resumePayload
        : undefined,
    );
  }

  public static async fromExecuteStepInput(
    input: ExecuteStepOperation,
  ): Promise<EngineConstants> {
    const project = await EngineConstants.fetchProject(
      input.internalApiUrl,
      input.engineToken,
    );

    return new EngineConstants(
      null,
      input.flowVersion.flowId,
      input.flowVersion.displayName,
      input.flowVersion.id,
      input.flowVersion.state,
      openOpsId(),
      input.publicUrl,
      addTrailingSlashIfMissing(input.internalApiUrl),
      DEFAULT_RETRY_CONSTANTS,
      input.engineToken,
      input.projectId,
      createPropsResolver({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
      input.flowVersion.testRunActionLimits,
      true,
      project.tablesDatabaseId,
      project.tablesDatabaseToken,
    );
  }

  public static async fromExecutePropertyInput(
    input: ExecutePropsOptions,
  ): Promise<EngineConstants> {
    const project = await EngineConstants.fetchProject(
      input.internalApiUrl,
      input.engineToken,
    );

    return new EngineConstants(
      null,
      input.flowVersion.flowId,
      input.flowVersion.displayName,
      input.flowVersion.id,
      input.flowVersion.state,
      'execute-property',
      input.publicUrl,
      addTrailingSlashIfMissing(input.internalApiUrl),
      DEFAULT_RETRY_CONSTANTS,
      input.engineToken,
      input.projectId,
      createPropsResolver({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
      input.flowVersion.testRunActionLimits,
      true,
      project.tablesDatabaseId,
      project.tablesDatabaseToken,
    );
  }

  public static async fromExecuteTriggerInput(
    input: ExecuteTriggerOperation<TriggerHookType>,
  ): Promise<EngineConstants> {
    const project = await EngineConstants.fetchProject(
      input.internalApiUrl,
      input.engineToken,
    );

    return new EngineConstants(
      null,
      input.flowVersion.flowId,
      input.flowVersion.displayName,
      input.flowVersion.id,
      input.flowVersion.state,
      'execute-trigger',
      input.publicUrl,
      addTrailingSlashIfMissing(input.internalApiUrl),
      DEFAULT_RETRY_CONSTANTS,
      input.engineToken,
      input.projectId,
      createPropsResolver({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
      input.flowVersion.testRunActionLimits,
      input.test,
      project.tablesDatabaseId,
      project.tablesDatabaseToken,
    );
  }

  private static async fetchProject(
    internalApiUrl: string,
    engineToken: string,
  ): Promise<Project> {
    const getWorkerProjectEndpoint = `${addTrailingSlashIfMissing(
      internalApiUrl,
    )}v1/worker/project`;

    const response = await fetch(getWorkerProjectEndpoint, {
      headers: {
        Authorization: `Bearer ${engineToken}`,
      },
    });

    return (await response.json()) as Project;
  }
}

const addTrailingSlashIfMissing = (url: string): string => {
  return url.endsWith('/') ? url : url + '/';
};
