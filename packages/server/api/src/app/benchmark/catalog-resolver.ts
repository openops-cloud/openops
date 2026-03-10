import fs from 'node:fs';
import path from 'node:path';
import {
  type LifecycleWorkflow,
  PROVIDER_LIFECYCLE_WORKFLOWS,
} from './catalog-manifests';
import { throwValidationError } from './errors';

const WORKFLOWS_CATALOG_DIR = 'workflows-catalog';

function getCatalogDir(provider: string): string {
  return path.join(__dirname, WORKFLOWS_CATALOG_DIR, provider.toLowerCase());
}

function getLifecycleWorkflow(provider: string): LifecycleWorkflow {
  const normalized = provider.toLowerCase();
  const lifecycleWorkflow = PROVIDER_LIFECYCLE_WORKFLOWS[normalized];
  if (!lifecycleWorkflow) {
    throwValidationError(`Unsupported benchmark provider: ${provider}`);
  }
  return lifecycleWorkflow;
}

function getOrchestratorId(provider: string): string {
  return getLifecycleWorkflow(provider).orchestratorWorkflowId;
}

function getCleanupWorkflowId(provider: string): string {
  return getLifecycleWorkflow(provider).cleanupWorkflowId;
}

export type ResolvedWorkflowPath = {
  id: string;
  filePath: string;
};

export type CategorizedWorkflowPaths = {
  orchestrator: ResolvedWorkflowPath;
  cleanup: ResolvedWorkflowPath;
  subWorkflows: ResolvedWorkflowPath[];
};

function resolveWorkflowPaths(
  provider: string,
  workflowIds: string[],
): ResolvedWorkflowPath[] {
  const catalogDir = getCatalogDir(provider);
  const result: ResolvedWorkflowPath[] = [];
  for (const id of workflowIds) {
    const filePath = path.join(catalogDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throwValidationError(`Workflow catalog file not found: ${id}`);
    }
    result.push({ id, filePath });
  }
  return result;
}

export function resolveWorkflowPathsForSeed(
  provider: string,
  subWorkflowIds: string[],
): CategorizedWorkflowPaths {
  if (subWorkflowIds.length === 0) {
    throwValidationError('At least one sub-workflow is required');
  }

  const orchestratorId = getOrchestratorId(provider);
  const cleanupId = getCleanupWorkflowId(provider);

  const allIds = [orchestratorId, cleanupId, ...subWorkflowIds];
  const paths = resolveWorkflowPaths(provider, allIds);

  return {
    orchestrator: paths[0],
    cleanup: paths[1],
    subWorkflows: paths.slice(2),
  };
}
