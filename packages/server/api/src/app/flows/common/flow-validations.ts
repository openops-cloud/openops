import {
  ApplicationError,
  ErrorCode,
  Flow,
  FlowVersion,
  PopulatedFlow,
} from '@openops/shared';
import { flowService } from '../flow/flow.service';

export async function assertFlowVersionBelongsToProject(
  flowVersion: FlowVersion,
  projectId: string,
): Promise<void> {
  const flow = await flowService.getOne({
    id: flowVersion.flowId,
    projectId,
  });

  if (flow === null || flow === undefined) {
    throw new ApplicationError({
      code: ErrorCode.AUTHORIZATION,
      params: {
        message: 'The flow and version are not associated with the project',
      },
    });
  }
}

export function assertFlowBelongsToProject(
  flow: PopulatedFlow | Flow,
  projectId: string,
): void {
  if (flow.projectId !== projectId) {
    throw new ApplicationError({
      code: ErrorCode.AUTHORIZATION,
      params: {
        message: 'The flow is not associated with the project',
      },
    });
  }
}
