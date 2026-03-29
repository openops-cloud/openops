import { FlowRunStatus, SimplifiedRunStatus } from '@openops/shared';
import { flowRunRepo } from './flow-run-service';

export type FlowRunSummary = {
  id: string;
  status: FlowRunStatus;
  finishTime?: string;
};

export function resolveRunStatus(status: FlowRunStatus): SimplifiedRunStatus {
  switch (status) {
    case FlowRunStatus.RUNNING:
    case FlowRunStatus.PAUSED:
    case FlowRunStatus.SCHEDULED:
      return SimplifiedRunStatus.RUNNING;
    case FlowRunStatus.FAILED:
    case FlowRunStatus.INTERNAL_ERROR:
    case FlowRunStatus.TIMEOUT:
    case FlowRunStatus.IGNORED:
    case FlowRunStatus.INFRASTRUCTURE_ERROR:
      return SimplifiedRunStatus.FAILED;
    default:
      return SimplifiedRunStatus.SUCCEEDED;
  }
}

export async function getLatestRunByFlowId(
  flowIds: string[],
  projectId: string,
): Promise<Record<string, FlowRunSummary | undefined>> {
  if (flowIds.length === 0) {
    return {};
  }

  const rows = await flowRunRepo()
    .createQueryBuilder('fr')
    .distinctOn(['fr.flowId'])
    .select('fr.flowId', 'flowId')
    .addSelect('fr.id', 'id')
    .addSelect('fr.status', 'status')
    .addSelect('fr.finishTime', 'finishTime')
    .where('fr.projectId = :projectId', { projectId })
    .andWhere('fr.flowId IN (:...flowIds)', { flowIds })
    .orderBy('fr.flowId', 'ASC')
    .addOrderBy('fr.created', 'DESC')
    .addOrderBy('fr.id', 'DESC')
    .getRawMany<{
      id: string;
      flowId: string;
      status: FlowRunStatus;
      finishTime?: string;
    }>();

  const result: Record<string, FlowRunSummary | undefined> = Object.fromEntries(
    flowIds.map((fid) => [fid, undefined]),
  );
  for (const r of rows) {
    result[r.flowId] = { id: r.id, status: r.status, finishTime: r.finishTime };
  }
  return result;
}
