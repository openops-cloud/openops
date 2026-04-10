export type LifecycleWorkflow = {
  orchestratorWorkflowId: string;
  cleanupWorkflowId: string;
};

export const PROVIDER_LIFECYCLE_WORKFLOWS: Record<string, LifecycleWorkflow> = {
  aws: {
    orchestratorWorkflowId: 'Run AWS Benchmark - orchestrator',
    cleanupWorkflowId: 'Clean-up AWS Benchmark data',
  },
  azure: {
    orchestratorWorkflowId: 'Run Azure Benchmark - orchestrator',
    cleanupWorkflowId: 'Clean-up Azure Benchmark data',
  },
};
