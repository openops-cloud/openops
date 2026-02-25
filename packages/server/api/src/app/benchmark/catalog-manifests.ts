export type CatalogManifest = {
  orchestratorWorkflowId: string;
  cleanupWorkflowId: string;
};

export const PROVIDER_CATALOG_MANIFESTS: Record<string, CatalogManifest> = {
  aws: {
    orchestratorWorkflowId: 'Run AWS Benchmark - orchestrator',
    cleanupWorkflowId: 'Clean-up AWS Benchmark data',
  },
};
