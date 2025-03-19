import { hashUtils } from '@openops/server-shared';
import {
  Action,
  FlowId,
  FlowOperationRequest,
  FlowRunStatus,
  ProjectId,
  Trigger,
} from '@openops/shared';
import { telemetry } from '../telemetry';

export type WorkflowBase = {
  flowId: string;
  projectId: string;
};

export enum WorkflowEventName {
  CREATED_WORKFLOW = 'workflow_created',
  DELETED_WORKFLOW = 'workflow_deleted',
  WORKFLOW_UPDATED = 'workflow_updated',
  WORKFLOW_EXPORTED = 'workflow_exported',
  WORKFLOW_TEST_BLOCK = 'workflow_test_block',
  CREATED_WORKFLOW_FROM_TEMPLATE = 'workflow_created_from_template',
}

export function sendWorkflowCreatedEvent(
  userId: string,
  flowId: string,
  projectId: string,
): void {
  telemetry.trackEvent({
    name: WorkflowEventName.CREATED_WORKFLOW,
    labels: {
      userId,
      flowId,
      projectId,
    },
  });
}

export function sendWorkflowCreatedFromTemplateEvent(
  userId: string,
  flowId: string,
  projectId: string,
  templateId: string,
  templateName: string,
  isSample: boolean,
): void {
  telemetry.trackEvent({
    name: WorkflowEventName.CREATED_WORKFLOW_FROM_TEMPLATE,
    labels: {
      userId,
      flowId,
      projectId,
      templateId,
      templateName,
      isSample: isSample.toString(),
    },
  });
}

export function sendWorkflowDeletedEvent(
  userId: string,
  flowId: string,
  projectId: string,
): void {
  telemetry.trackEvent({
    name: WorkflowEventName.DELETED_WORKFLOW,
    labels: {
      userId,
      flowId,
      projectId,
    },
  });
}

export function sendWorkflowExportedEvent(eventParams: {
  userId: string;
  flowId: string;
  projectId: string;
  flowVersionId: string;
}): void {
  telemetry.trackEvent({
    name: WorkflowEventName.WORKFLOW_EXPORTED,
    labels: {
      userId: eventParams.userId,
      flowId: eventParams.flowId,
      projectId: eventParams.projectId,
      flowVersionId: eventParams.flowVersionId,
    },
  });
}

export function sendWorkflowUpdatedEvent(eventParams: {
  id: FlowId;
  userId: string;
  projectId: ProjectId;
  flowVersionId: string;
  operation: FlowOperationRequest;
}): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = eventParams.operation.request as any;

  const labels = getUpdateEventLabels(request, eventParams);
  if (labels.blockName === '@openops/block-openops-tables') {
    const tableName = request?.settings?.input?.tableName || '';
    telemetry.trackEvent({
      name: WorkflowEventName.WORKFLOW_UPDATED,
      labels: {
        ...labels,
        tableId: hashUtils.hashObject(tableName),
      },
    });
    return;
  }

  telemetry.trackEvent({
    name: WorkflowEventName.WORKFLOW_UPDATED,
    labels,
  });
}

export function sendWorkflowTestBlockEvent(eventParams: {
  userId: string;
  projectId: string;
  flowId: string;
  success: boolean;
  duration: number;
  step: Action | Trigger;
}): void {
  telemetry.trackEvent({
    name: WorkflowEventName.WORKFLOW_TEST_BLOCK,
    labels: {
      userId: eventParams.userId,
      flowId: eventParams.flowId,
      projectId: eventParams.projectId,
      status: eventParams.success
        ? FlowRunStatus.SUCCEEDED
        : FlowRunStatus.FAILED,
      stepType: eventParams.step.type,
      blockName: eventParams.step.settings?.blockName || '',
      actionName: eventParams.step?.settings?.actionName || '',
      duration: eventParams.duration.toString(),
    },
  });
}

function getUpdateEventLabels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
  eventParams: {
    id: FlowId;
    userId: string;
    projectId: ProjectId;
    flowVersionId: string;
    operation: FlowOperationRequest;
  },
) {
  return {
    userId: eventParams.userId,
    flowId: eventParams.id,
    projectId: eventParams.projectId,
    flowVersionId: eventParams.flowVersionId,
    updateType: eventParams.operation.type,
    newStatus: request?.status || '',
    triggerType: request?.type || '',
    actionType: request?.action?.type || request?.type || '',
    blockName:
      request?.settings?.blockName ||
      request?.action?.settings?.blockName ||
      '',
    actionName:
      request?.settings?.actionName ||
      request?.action?.settings?.actionName ||
      '',
  };
}
