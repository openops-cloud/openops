import { encryptUtils, fileCompressor } from '@openops/server-shared';
import {
  ActionType,
  BranchStepOutput,
  FileCompression,
  flowHelper,
  FlowVersion,
  GenericStepOutput,
  LoopStepOutput,
  OpenOpsId,
  SplitStepOutput,
  StepOutputStatus,
  TriggerType,
} from '@openops/shared';
import { FlowExecutorContext } from './flow-execution-context';

export const testExecutionContext = {
  async stateFromFlowVersion({
    flowVersion,
    excludedStepName,
    projectId,
    engineToken,
    apiUrl,
    testOutputs,
  }: {
    flowVersion: FlowVersion;
    excludedStepName?: string;
    projectId: string;
    apiUrl: string;
    engineToken: string;
    testOutputs?: Record<OpenOpsId, string>;
  }): Promise<FlowExecutorContext> {
    const flowSteps = flowHelper.getAllSteps(flowVersion.trigger);
    let flowExecutionContext = FlowExecutorContext.empty();

    for (const step of flowSteps) {
      const {
        name,
        settings: { inputUiInfo },
      } = step;
      if (name === excludedStepName) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentOutput: any;
      if (testOutputs && step.id) {
        currentOutput = await decompressOutput(testOutputs?.[step.id]);
      } else {
        currentOutput = inputUiInfo?.currentSelectedData;
      }

      const stepType = step.type;
      switch (stepType) {
        case ActionType.BRANCH:
          flowExecutionContext = flowExecutionContext.upsertStep(
            step.name,
            BranchStepOutput.init({
              input: step.settings,
            }),
          );
          break;
        case ActionType.SPLIT: {
          flowExecutionContext = flowExecutionContext.upsertStep(
            step.name,
            SplitStepOutput.init({
              input: step.settings,
            }),
          );
          break;
        }
        case ActionType.LOOP_ON_ITEMS: {
          flowExecutionContext = flowExecutionContext.upsertStep(
            step.name,
            LoopStepOutput.init({
              input: step.settings,
            }).setOutput({
              item: currentOutput?.item,
              index: 1,
              iterations: [],
            }),
          );
          break;
        }
        case ActionType.BLOCK:
        case ActionType.CODE:
        case TriggerType.EMPTY:
        case TriggerType.BLOCK:
          flowExecutionContext = flowExecutionContext.upsertStep(
            step.name,
            GenericStepOutput.create({
              input: step.settings,
              type: stepType,
              status: StepOutputStatus.SUCCEEDED,
              output: currentOutput,
            }),
          );
          break;
      }
    }
    return flowExecutionContext;
  },
};

async function decompressOutput(output: string): Promise<unknown> {
  if (!output) {
    return undefined;
  }

  const decompressed = await fileCompressor.decompress({
    data: Buffer.from(output, 'base64'),
    compression: FileCompression.GZIP,
  });

  const parsedEncryptedOutput = JSON.parse(decompressed.toString());
  return encryptUtils.decryptObject(parsedEncryptedOutput);
}
