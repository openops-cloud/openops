import { ApplicationError, ContentType, ErrorCode } from '@openops/shared';
import { flowService } from '../flow/flow.service';

export const getFolderFlows = async (
  projectId: string,
  contentType: ContentType,
  folderId: string | null,
  limit = 100,
) => {
  if (contentType === ContentType.WORKFLOW) {
    return flowService.getWorkflowsByFolder({ projectId, folderId, limit });
  }

  throw new ApplicationError({
    code: ErrorCode.VALIDATION,
    params: { message: 'Invalid content type' },
  });
};
