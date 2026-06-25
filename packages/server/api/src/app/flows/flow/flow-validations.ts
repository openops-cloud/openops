import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  ContentType,
  ErrorCode,
  Flow,
  FlowStatus,
  isNil,
  PopulatedFlow,
} from '@openops/shared';
import dayjs from 'dayjs';

/**
 * Ensures every requested flow id exists in the project (same count as returned rows).
 * Call after loading flows with `In(flowIds)` and `projectId`.
 */
export function assertAllRequestedFlowsExistInProject(
  requestedFlowIds: string[],
  flowsFromDb: Flow[],
): void {
  if (flowsFromDb.length !== requestedFlowIds.length) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {},
    });
  }
}

export function assertNoFlowsAreEnabledForDeletion(flows: Flow[]): void {
  const hasEnabled = flows.some((flow) => flow.status === FlowStatus.ENABLED);
  if (hasEnabled) {
    throw new ApplicationError({
      code: ErrorCode.FLOW_OPERATION_INVALID,
      params: {},
    });
  }
}

export async function assertNoFlowsAreInternal(flows: Flow[]): Promise<void> {
  for (const flow of flows) {
    await assertThatFlowIsNotInternal(flow);
  }
}

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
