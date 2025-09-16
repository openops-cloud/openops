import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  ContentType,
  ErrorCode,
  Flow,
  isNil,
  PopulatedFlow,
} from '@openops/shared';
import dayjs from 'dayjs';

export async function assertThatFlowIsNotInternal(flow: Flow): Promise<void> {
  if (flow.isInternal) {
    const message =
      'Flow is internal, cannot be manipulated through the flow API.';
    logger.warn(message, {
      flowId: flow.id,
    });
    throw new ApplicationError({
      code: ErrorCode.FLOW_INTERNAL_FORBIDDEN,
      params: {
        message,
      },
    });
  }
}

export async function assertThatFlowIsNotBeingUsed(
  flow: PopulatedFlow,
  userId: string,
): Promise<void> {
  const currentTime = dayjs();
  if (
    !isNil(flow.version.updatedBy) &&
    flow.version.updatedBy !== userId &&
    currentTime.diff(dayjs(flow.version.updated), 'minute') <= 1
  ) {
    throw new ApplicationError({
      code: ErrorCode.FLOW_IN_USE,
      params: {
        flowVersionId: flow.version.id,
        message:
          'Flow is being used by another user in the last minute. Please try again later.',
      },
    });
  }
}

export async function assertThatFlowIsInCorrectFolderContentType(
  expectedContentType: ContentType,
  contentType: ContentType,
): Promise<void> {
  if (contentType !== expectedContentType) {
    throw new ApplicationError({
      code: ErrorCode.VALIDATION,
      params: {
        message: 'Incorrect folder content type for request',
      },
    });
  }
}
