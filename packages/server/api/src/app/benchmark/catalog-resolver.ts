import fs from 'node:fs';
import path from 'node:path';
import {
  type CatalogManifest,
  PROVIDER_CATALOG_MANIFESTS,
} from './catalog-manifests';
import { throwValidationError } from './errors';

const WORKFLOWS_CATALOG_DIR = 'workflows-catalog';

function getCatalogDir(provider: string): string {
  return path.join(__dirname, WORKFLOWS_CATALOG_DIR, provider.toLowerCase());
}

function getCatalogManifest(provider: string): CatalogManifest {
  const normalized = provider.toLowerCase();
  const manifest = PROVIDER_CATALOG_MANIFESTS[normalized];
  if (!manifest) {
    throwValidationError(`Unsupported benchmark provider: ${provider}`);
  }
  return manifest;
}

export function getOrchestratorId(provider: string): string {
  return getCatalogManifest(provider).orchestratorWorkflowId;
}

export function getCleanupWorkflowId(provider: string): string {
  return getCatalogManifest(provider).cleanupWorkflowId;
}

export type ResolvedWorkflowPath = {
  id: string;
  filePath: string;
};

export function resolveWorkflowPaths(
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
): ResolvedWorkflowPath[] {
  const orchestratorId = getOrchestratorId(provider);
  const cleanupId = getCleanupWorkflowId(provider);
  const allIds = [orchestratorId, cleanupId, ...subWorkflowIds];
  return resolveWorkflowPaths(provider, allIds);
}
