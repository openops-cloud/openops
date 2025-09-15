import { ApplicationError, ContentType, ErrorCode } from '@openops/shared';
import { flowService } from '../flow/flow.service';

export type FlowFilterResult = {
  condition: string;
  params: Record<string, unknown>;
};

export async function getFlowFilter(
  contentType: ContentType,
): Promise<FlowFilterResult> {
  if (contentType === ContentType.WORKFLOW) {
    const result = await flowService.filterVisibleFlows();
    return {
      condition: result.flowFilterCondition,
      params: result.flowFilterParams,
    };
  } else {
    throw new ApplicationError({
      code: ErrorCode.VALIDATION,
      params: { message: 'Invalid content type' },
    });
  }
}
