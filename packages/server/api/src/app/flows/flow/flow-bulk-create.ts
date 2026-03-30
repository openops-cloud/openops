import {
  AppConnectionsWithSupportedBlocks,
  FlowStatus,
  FlowVersion,
  FlowVersionState,
  TriggerWithOptionalId,
  flowHelper,
  openOpsId,
} from '@openops/shared';
import fs from 'node:fs/promises';
import { EntityManager } from 'typeorm';
import { flowRepo } from './flow.repo';

export async function loadWorkflowTemplate(
  filePath: string,
): Promise<WorkflowTemplate> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content) as {
    template: WorkflowTemplate['template'];
  };
  return { template: parsed.template };
}

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
  connections: AppConnectionsWithSupportedBlocks[],
  projectId: string,
  folderId: string,
): Promise<BulkFlowResult[]> {
  if (templates.length === 0) {
    return [];
  }

  const flowsWithVersions = templates.map((template) =>
    buildFlowAndVersion(template, projectId, folderId, connections),
  );

  await flowRepo().manager.transaction(async (trx) => {
    await trx
      .getRepository('flow')
      .insert(flowsWithVersions.map((b) => b.flow));

    const versionsToInsert = flowsWithVersions.map((b) => b.version);
    await trx.getRepository('flow_version').insert(versionsToInsert as never);

    await bulkUpdatePublishedVersionIds(trx, flowsWithVersions);
  });

  return flowsWithVersions.map((b) => ({
    id: b.flow.id,
    version: { id: b.version.id, displayName: b.version.displayName },
  }));
}

async function bulkUpdatePublishedVersionIds(
  manager: EntityManager,
  flowsToUpdate: Array<{ flow: FlowInsertRecord; version: FlowVersion }>,
): Promise<void> {
  if (flowsToUpdate.length === 0) {
    return;
  }

  const params: string[] = [];
  const valuesSql = flowsToUpdate
    .map(({ flow, version }) => {
      const flowIdIndex = params.push(flow.id);
      const versionIdIndex = params.push(version.id);
      return `($${flowIdIndex}, $${versionIdIndex})`;
    })
    .join(', ');

  params.push(FlowStatus.ENABLED);
  const statusParam = params.length;

  await manager.query(
    `
    UPDATE flow f
    SET
      status = $${statusParam},
      "publishedVersionId" = v.version_id
    FROM (
      VALUES ${valuesSql}
    ) AS v(flow_id, version_id)
    WHERE f.id = v.flow_id
    `,
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
      ...trigger,
      id: openOpsId(),
      nextAction: null,
    },
    valid: false,
    state: FlowVersionState.DRAFT,
    testRunActionLimits: { isEnabled: true, limits: [] },
  } as unknown as FlowVersion;

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
