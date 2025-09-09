import { ApplicationError, ContentType, ErrorCode } from '@openops/shared';
import { flowService } from '../flow/flow.service';

export const getUncategorizedFlows = async (
  projectId: string,
  contentType: ContentType,
) => {
  if (contentType === ContentType.WORKFLOW) {
    return flowService.getUncategoriedFolderWorklows(projectId);
  }
  throw new ApplicationError({
    code: ErrorCode.VALIDATION,
    params: { message: 'Invalid content type' },
  });
};
