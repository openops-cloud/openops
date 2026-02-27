import {
  AppConnectionsWithSupportedBlocks,
  FlowOperationType,
  FlowStatus,
  FlowVersion,
  FlowVersionState,
  TriggerType,
  TriggerWithOptionalId,
  flowHelper,
  openOpsId,
} from '@openops/shared';
import dayjs from 'dayjs';
import { EntityManager } from 'typeorm';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { resolveProvidersForBlocks } from '../app-connection/connection-providers-resolver';
import { flowRepo } from '../flows/flow/flow.repo';

export type WorkflowTemplate = {
  template: {
    displayName: string;
    description?: string;
    trigger: TriggerWithOptionalId;
  };
};

export type BulkFlowResult = {
  id: string;
  version: { id: string; displayName: string };
};

type FlowInsertRecord = {
  id: string;
  projectId: string;
  folderId: string | null;
  status: FlowStatus;
  publishedVersionId: null;
  isInternal: boolean;
  schedule: null;
};

export async function bulkCreateAndPublishFlows(
  templates: WorkflowTemplate[],
  connectionIds: string[],
  projectId: string,
  folderId: string,
): Promise<BulkFlowResult[]> {
  if (templates.length === 0) {
    return [];
  }

  const connections =
    connectionIds.length > 0
      ? await fetchConnections(
          projectId,
          templates[0].template.trigger,
          connectionIds,
        )
      : [];

  const flowsWithVersions = templates.map((template) =>
    buildFlowAndVersion(template, projectId, folderId, connections),
  );

  await flowRepo().manager.transaction(async (trx) => {
    await trx
      .getRepository('flow')
      .insert(flowsWithVersions.map((b) => b.flow));

    const versionsToInsert = flowsWithVersions.map((b) => ({
      ...b.version,
      created: dayjs().toISOString(),
      updated: dayjs().toISOString(),
    }));
    await trx.getRepository('flow_version').insert(versionsToInsert as never);

    await bulkUpdatePublishedVersionIds(trx, flowsWithVersions);
  });

  return flowsWithVersions.map((b) => ({
    id: b.flow.id,
    version: { id: b.version.id, displayName: b.version.displayName },
  }));
}

async function fetchConnections(
  projectId: string,
  triggerForBlockNames: TriggerWithOptionalId,
  connectionIds: string[],
): Promise<AppConnectionsWithSupportedBlocks[]> {
  const connectionsList = await appConnectionService.listActiveConnectionsByIds(
    projectId,
    connectionIds,
  );

  const blockNames = flowHelper
    .getAllSteps(triggerForBlockNames)
    .map((s) => s.settings?.blockName)
    .filter(Boolean) as string[];

  const blockToProviderMap = await resolveProvidersForBlocks(
    blockNames,
    projectId,
  );

  return connectionsList.map((connection) => ({
    ...connection,
    supportedBlocks: blockToProviderMap[connection.authProviderKey],
  }));
}

async function bulkUpdatePublishedVersionIds(
  manager: EntityManager,
  built: Array<{ flow: FlowInsertRecord; version: FlowVersion }>,
): Promise<void> {
  const params: string[] = [];

  const caseParts = built.map((b) => {
    params.push(b.flow.id, b.version.id);
    const whenIdx = params.length - 1;
    const thenIdx = params.length;
    return `WHEN $${whenIdx} THEN $${thenIdx}`;
  });

  const whereInStart = params.length;
  built.forEach((b) => params.push(b.flow.id));

  params.push(FlowStatus.ENABLED);
  const statusIdx = params.length;

  const whereIn = built.map((_, i) => `$${whereInStart + i + 1}`).join(', ');

  await manager.query(
    `UPDATE flow SET "publishedVersionId" = CASE id ${caseParts.join(
      ' ',
    )} END, status = $${statusIdx} WHERE id IN (${whereIn})`,
    params,
  );
}

function buildFlowAndVersion(
  template: WorkflowTemplate,
  projectId: string,
  folderId: string,
  connections: AppConnectionsWithSupportedBlocks[],
): { flow: FlowInsertRecord; version: FlowVersion } {
  const flowId = openOpsId();
  const versionId = openOpsId();
  const { displayName, description, trigger } = template.template;

  let version = {
    id: versionId,
    flowId,
    displayName,
    description: description ?? '',
    trigger: {
      id: openOpsId(),
      type: TriggerType.EMPTY,
      name: 'trigger',
      settings: {},
      valid: false,
      displayName: 'Select Trigger',
    },
    valid: false,
    state: FlowVersionState.DRAFT,
    testRunActionLimits: { isEnabled: true, limits: [] },
  } as unknown as FlowVersion;

  version = flowHelper.apply(version, {
    type: FlowOperationType.UPDATE_TRIGGER,
    request: trigger,
  });
  version = flowHelper.apply(version, {
    type: FlowOperationType.CHANGE_NAME,
    request: { displayName },
  });
  version = flowHelper.apply(version, {
    type: FlowOperationType.CHANGE_DESCRIPTION,
    request: { description: description ?? '' },
  });

  for (const op of flowHelper.getImportOperations(trigger, connections)) {
    version = flowHelper.apply(version, op);
  }

  const lockedVersion: FlowVersion = {
    ...version,
    state: FlowVersionState.LOCKED,
  };

  const flow: FlowInsertRecord = {
    id: flowId,
    projectId,
    folderId,
    status: FlowStatus.DISABLED,
    publishedVersionId: null,
    isInternal: false,
    schedule: null,
  };

  return { flow, version: lockedVersion };
}
