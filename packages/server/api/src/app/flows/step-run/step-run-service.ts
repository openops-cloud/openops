import {
  Action,
  ActionType,
  ApplicationError,
  ErrorCode,
  flowHelper,
  FlowVersionId,
  groupStepOutputsById,
  isNil,
  ProjectId,
  StepRunResponse,
  Trigger,
  UserId,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../authentication/context/access-token-manager';
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
    const stepIds = flowHelper.getAllStepIds(flowVersion.trigger);

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

    const outputs = await flowStepTestOutputService.listEncrypted({
      flowVersionId: flowVersion.id,
      stepIds: stepIds.filter((item) => item !== step.id),
    });

    const stepTestOutputs = groupStepOutputsById(outputs);

    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });

    const { result } = await engineRunner.executeAction(engineToken, {
      stepName,
      flowVersion,
      projectId,
      stepTestOutputs,
    });

    if (step.id) {
      await flowStepTestOutputService.save({
        stepId: step.id,
        flowVersionId: flowVersion.id,
        output: result.output,
        input: result.input,
        success: result.success,
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
      step: step as Action | Trigger,
    });

    return {
      success: result.success,
      input: result.input,
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
