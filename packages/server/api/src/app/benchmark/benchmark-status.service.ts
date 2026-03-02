import {
  ApplicationError,
  BenchmarkStatus,
  BenchmarkStatusResponse,
  BenchmarkWorkflowStatusItem,
  ErrorCode,
  FlowRunStatus,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import { flowRunRepo } from '../flows/flow-run/flow-run-service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';

type FlowRow = {
  flowId: string;
  isOrchestrator: boolean;
  displayName: string | null;
};

type FlowRunSummary = {
  id: string;
  status: FlowRunStatus;
  finishTime?: string;
};

function mapFlowRunStatusToBenchmarkStatus(
  status: FlowRunStatus,
): BenchmarkStatus {
  switch (status) {
    case FlowRunStatus.RUNNING:
    case FlowRunStatus.PAUSED:
    case FlowRunStatus.SCHEDULED:
      return BenchmarkStatus.RUNNING;
    case FlowRunStatus.FAILED:
    case FlowRunStatus.INTERNAL_ERROR:
    case FlowRunStatus.TIMEOUT:
    case FlowRunStatus.IGNORED:
      return BenchmarkStatus.FAILED;
    default:
      return BenchmarkStatus.SUCCEEDED;
  }
}

async function fetchBenchmarkOrThrow(
  benchmarkId: string,
  projectId: string,
): Promise<void> {
  const benchmark = await benchmarkRepo().findOne({
    where: { id: benchmarkId, projectId, deletedAt: IsNull() },
  });

  if (!benchmark) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        entityType: 'Benchmark',
        entityId: benchmarkId,
      },
    });
  }
}

async function fetchBenchmarkFlowRows(benchmarkId: string): Promise<FlowRow[]> {
  return benchmarkFlowRepo()
    .createQueryBuilder('bf')
    .leftJoin('flow', 'f', 'f.id = bf.flowId')
    .leftJoin('flow_version', 'fv', 'fv.id = f.publishedVersionId')
    .select([
      'bf.flowId AS "flowId"',
      'bf.isOrchestrator AS "isOrchestrator"',
      'fv.displayName AS "displayName"',
    ])
    .where('bf.benchmarkId = :benchmarkId', { benchmarkId })
    .andWhere('bf.deletedAt IS NULL')
    .getRawMany<FlowRow>();
}

function buildWorkflowStatusItems(
  flowRows: FlowRow[],
  latestRunByFlowId: Record<string, FlowRunSummary | undefined>,
): BenchmarkWorkflowStatusItem[] {
  return flowRows.map((row) => {
    const latestRun = latestRunByFlowId[row.flowId];
    return {
      flowId: row.flowId,
      displayName: row.displayName ?? '',
      isOrchestrator: row.isOrchestrator,
      runStatus: latestRun
        ? mapFlowRunStatusToBenchmarkStatus(latestRun.status)
        : BenchmarkStatus.CREATED,
      runId: latestRun?.id,
    };
  });
}

async function getLatestRunByFlowId(
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

  const result: Record<string, FlowRunSummary | undefined> = {};
  for (const r of rows) {
    result[r.flowId] = { id: r.id, status: r.status, finishTime: r.finishTime };
  }
  return result;
}

export async function getBenchmarkStatus(params: {
  benchmarkId: string;
  projectId: string;
}): Promise<BenchmarkStatusResponse> {
  const { benchmarkId, projectId } = params;

  await fetchBenchmarkOrThrow(benchmarkId, projectId);
  const flowRows = await fetchBenchmarkFlowRows(benchmarkId);
  const flowIds = flowRows.map((r) => r.flowId);
  const latestRunByFlowId = await getLatestRunByFlowId(flowIds, projectId);

  const orchestratorRow = flowRows.find((r) => r.isOrchestrator);
  const orchestratorRun = orchestratorRow
    ? latestRunByFlowId[orchestratorRow.flowId]
    : undefined;

  const status = orchestratorRun
    ? mapFlowRunStatusToBenchmarkStatus(orchestratorRun.status)
    : BenchmarkStatus.CREATED;

  const workflows = buildWorkflowStatusItems(flowRows, latestRunByFlowId);

  return {
    benchmarkId,
    status,
    workflows,
    lastRunId: orchestratorRun?.id,
    lastRunFinishedAt: orchestratorRun?.finishTime,
  };
}
