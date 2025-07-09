import {
  BlockMetadata,
  DropdownState,
  DynamicPropsValue,
} from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  BeginExecuteFlowOperation,
  EngineResponseStatus,
  ErrorCode,
  ExecuteActionResponse,
  ExecuteExtractBlockMetadata,
  ExecutePropsOptions,
  ExecuteStepOperation,
  ExecuteTriggerOperation,
  ExecuteTriggerResponse,
  ExecuteValidateAuthOperation,
  ExecuteValidateAuthResponse,
  FlowRunResponse,
  FlowVersionState,
  ResolveVariableOperation,
  ResolveVariableResponse,
  ResumeExecuteFlowOperation,
  SourceCode,
  TriggerHookType,
} from '@openops/shared';
import chalk from 'chalk';

type EngineConstants = 'publicUrl' | 'internalApiUrl' | 'engineToken';

export type CodeArtifact = {
  name: string;
  sourceCode: SourceCode;
  flowVersionId: string;
  flowVersionState: FlowVersionState;
};

export type EngineHelperFlowResult = Pick<FlowRunResponse, 'status' | 'error'>;

export type EngineHelperTriggerResult<
  T extends TriggerHookType = TriggerHookType,
> = ExecuteTriggerResponse<T>;

export type EngineHelperPropResult =
  | DropdownState<unknown>
  | Record<string, DynamicPropsValue>;

export type EngineHelperActionResult = ExecuteActionResponse;

export type EngineHelperValidateAuthResult = ExecuteValidateAuthResponse;

export type EngineHelperCodeResult = ExecuteActionResponse;
export type EngineHelperExtractBlockInformation = BlockMetadata;
export type EngineHelperVariableResult = ResolveVariableResponse;

export type EngineHelperResult =
  | EngineHelperFlowResult
  | EngineHelperTriggerResult
  | EngineHelperPropResult
  | EngineHelperCodeResult
  | EngineHelperExtractBlockInformation
  | EngineHelperActionResult
  | EngineHelperValidateAuthResult
  | EngineHelperVariableResult;

export type EngineHelperResponse<Result extends EngineHelperResult> = {
  status: EngineResponseStatus;
  result: Result;
};

export type ExecuteSandboxResult = {
  output: unknown;
  timeInSeconds: number;
  verdict: EngineResponseStatus;
};

export type EngineRunner = {
  executeFlow(
    engineToken: string,
    operation:
      | Omit<BeginExecuteFlowOperation, EngineConstants>
      | Omit<ResumeExecuteFlowOperation, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperFlowResult>>;
  executeTrigger<T extends TriggerHookType>(
    engineToken: string,
    operation: Omit<ExecuteTriggerOperation<T>, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperTriggerResult<T>>>;
  extractBlockMetadata(
    operation: ExecuteExtractBlockMetadata,
  ): Promise<EngineHelperResponse<EngineHelperExtractBlockInformation>>;
  executeValidateAuth(
    engineToken: string,
    operation: Omit<ExecuteValidateAuthOperation, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperValidateAuthResult>>;
  executeAction(
    engineToken: string,
    operation: Omit<ExecuteStepOperation, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperActionResult>>;
  executeProp(
    engineToken: string,
    operation: Omit<ExecutePropsOptions, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperPropResult>>;
  executeVariable(
    engineToken: string,
    operation: Omit<ResolveVariableOperation, EngineConstants>,
  ): Promise<EngineHelperResponse<EngineHelperVariableResult>>;
};
