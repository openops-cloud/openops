import {
  ActionType,
  ApplicationError,
  ErrorCode,
  flowHelper,
  FlowVersionId,
  isNil,
  ProjectId,
  StepRunResponse,
  UserId,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../authentication/lib/access-token-manager';
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
    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });

    const { result } = await engineRunner.executeAction(engineToken, {
      stepName,
      flowVersion,
      projectId,
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
