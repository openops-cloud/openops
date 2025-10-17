import { FlowRunStatus, WorkflowStats } from '@openops/shared';
import { flowRunService } from '../flows/flow-run/flow-run-service';
import { flowService } from '../flows/flow/flow.service';

export async function getWorkflowsStats({
  projectId,
  createdAfter,
  createdBefore,
}: {
  projectId: string;
  createdAfter?: string;
  createdBefore?: string;
}): Promise<WorkflowStats> {
  const [
    activatedWorkflows,
    totalWorkflows,
    totalRuns,
    successfulRuns,
    failedRuns,
  ] = await Promise.all([
    flowService.countEnabled({ projectId }),
    flowService.count({ projectId }),
    flowRunService.count({ projectId, createdAfter, createdBefore }),
    flowRunService.count({
      projectId,
      status: [FlowRunStatus.SUCCEEDED],
      createdAfter,
      createdBefore,
    }),
    flowRunService.count({
      projectId,
      status: [
        FlowRunStatus.FAILED,
        FlowRunStatus.INTERNAL_ERROR,
        FlowRunStatus.TIMEOUT,
      ],
      createdAfter,
      createdBefore,
    }),
  ]);

  return {
    activatedWorkflows,
    totalWorkflows,
    totalRuns,
    successfulRuns,
    failedRuns,
  };
}
