import {
  ActionType,
  ApplicationError,
  encodeTestOutputs,
  ErrorCode,
  FlagId,
  flowHelper,
  FlowVersionId,
  isNil,
  OpenOpsId,
  ProjectId,
  StepRunResponse,
  UserId,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../authentication/lib/access-token-manager';
import { devFlagsService } from '../../flags/dev-flags.service';
import { sendWorkflowTestBlockEvent } from '../../telemetry/event-models';
import { flowVersionService } from '../flow-version/flow-version.service';
import { flowStepTestOutputService } from '../step-test-output/flow-step-test-output.service';

export const stepRunService = {
  async create({
    userId,
    projectId,
    flowVersionId,
    stepName,
  }: CreateParams): Promise<Omit<StepRunResponse, 'id'>> {
    const startTime = performance.now();

    const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);
    const step = flowHelper.getStep(flowVersion, stepName);
    const stepIds = flowHelper
      .getAllSteps(flowVersion.trigger)
      .filter((step) => step.id !== undefined)
      .map((step) => step.id as string);

    if (
      isNil(step) ||
      !Object.values(ActionType).includes(step.type as ActionType)
    ) {
      throw new ApplicationError({
        code: ErrorCode.STEP_NOT_FOUND,
        params: {
          stepName,
        },
      });
    }

    let testOutputs: Record<OpenOpsId, string> | undefined = undefined;
    const featureFlag = await devFlagsService.getOne(
      FlagId.USE_NEW_EXTERNAL_TESTDATA,
    );
    if (featureFlag && featureFlag.value) {
      const outputs = await flowStepTestOutputService.listEncrypted({
        flowVersionId: flowVersion.id,
        stepIds,
      });

      testOutputs = encodeTestOutputs(outputs);
    }

    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });

    const { result } = await engineRunner.executeAction(engineToken, {
      stepName,
      flowVersion,
      projectId,
      testOutputs,
    });

    if (step.id) {
      await flowStepTestOutputService.save({
        stepId: step.id,
        flowVersionId: flowVersion.id,
        output: result.output,
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendWorkflowTestBlockEvent({
      flowId: flowVersion.flowId,
      success: result.success,
      projectId,
      duration,
      userId,
      step,
    });

    return {
      success: result.success,
      output: result.output,
    };
  },
};

type CreateParams = {
  userId: UserId;
  projectId: ProjectId;
  flowVersionId: FlowVersionId;
  stepName: string;
};
