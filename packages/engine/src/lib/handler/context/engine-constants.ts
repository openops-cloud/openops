import {
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
  TriggerHookType,
} from '@openops/shared';
import { VariableService } from '../../variables/variable-service';

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
    public readonly variableService: VariableService,
    public readonly testSingleStepMode: boolean,
    public readonly filesServiceType: 'local' | 'db',
    public readonly progressUpdateType: ProgressUpdateType,
    public readonly serverHandlerId: string | null,
    public readonly resumePayload?: ResumePayload,
  ) {}

  public static fromExecuteFlowInput(
    input: ExecuteFlowOperation,
  ): EngineConstants {
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
      new VariableService({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: input.internalApiUrl,
      }),
      false,
      'local',
      input.progressUpdateType,
      input.serverHandlerId ?? null,
      input.executionType === ExecutionType.RESUME
        ? input.resumePayload
        : undefined,
    );
  }

  public static fromExecuteStepInput(
    input: ExecuteStepOperation,
  ): EngineConstants {
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
      new VariableService({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
    );
  }

  public static fromExecutePropertyInput(
    input: ExecutePropsOptions,
  ): EngineConstants {
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
      new VariableService({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
    );
  }

  public static fromExecuteTriggerInput(
    input: ExecuteTriggerOperation<TriggerHookType>,
  ): EngineConstants {
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
      new VariableService({
        projectId: input.projectId,
        engineToken: input.engineToken,
        apiUrl: addTrailingSlashIfMissing(input.internalApiUrl),
      }),
      true,
      'db',
      ProgressUpdateType.NONE,
      null,
    );
  }

  private async getProject(): Promise<Project> {
    if (this.project) {
      return this.project;
    }

    const getWorkerProjectEndpoint = `${this.internalApiUrl}v1/worker/project`;

    const response = await fetch(getWorkerProjectEndpoint, {
      headers: {
        Authorization: `Bearer ${this.engineToken}`,
      },
    });

    this.project = (await response.json()) as Project;
    return this.project;
  }
}

const addTrailingSlashIfMissing = (url: string): string => {
  return url.endsWith('/') ? url : url + '/';
};
