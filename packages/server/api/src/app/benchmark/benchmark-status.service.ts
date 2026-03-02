import {
  ApplicationError,
  BenchmarkListItem,
  BenchmarkProviders,
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

type FlowRowWithBenchmarkId = FlowRow & { benchmarkId: string };

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

async function fetchFlowRowsByBenchmarkIds(
  benchmarkIds: string[],
): Promise<FlowRowWithBenchmarkId[]> {
  if (benchmarkIds.length === 0) {
    return [];
  }
  return benchmarkFlowRepo()
    .createQueryBuilder('bf')
    .leftJoin('flow', 'f', 'f.id = bf.flowId')
    .leftJoin('flow_version', 'fv', 'fv.id = f.publishedVersionId')
    .select([
      'bf.benchmarkId AS "benchmarkId"',
      'bf.flowId AS "flowId"',
      'bf.isOrchestrator AS "isOrchestrator"',
      'fv.displayName AS "displayName"',
    ])
    .where('bf.benchmarkId IN (:...benchmarkIds)', { benchmarkIds })
    .andWhere('bf.deletedAt IS NULL')
    .getRawMany<FlowRowWithBenchmarkId>();
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

  return mapLatestRuns(flowIds, rows);
}

function mapLatestRuns(
  flowIds: string[],
  rows: {
    flowId: string;
    id: string;
    status: FlowRunStatus;
    finishTime?: string;
  }[],
): Record<string, FlowRunSummary | undefined> {
  const result: Record<string, FlowRunSummary | undefined> = Object.fromEntries(
    flowIds.map((fid) => [fid, undefined]),
  );
  for (const r of rows) {
    result[r.flowId] = { id: r.id, status: r.status, finishTime: r.finishTime };
  }
  return result;
}

function findOrchestratorRun(
  flowRows: FlowRow[],
  latestRunByFlowId: Record<string, FlowRunSummary | undefined>,
): FlowRunSummary | undefined {
  const orchestratorRow = flowRows.find((r) => r.isOrchestrator);
  return orchestratorRow
    ? latestRunByFlowId[orchestratorRow.flowId]
    : undefined;
}

function resolveOrchestratorStatus(
  run: FlowRunSummary | undefined,
): BenchmarkStatus {
  return run
    ? mapFlowRunStatusToBenchmarkStatus(run.status)
    : BenchmarkStatus.CREATED;
}

async function resolveStatusByBenchmarkId(
  benchmarkIds: string[],
  projectId: string,
): Promise<Map<string, BenchmarkStatus>> {
  const allFlowRows = await fetchFlowRowsByBenchmarkIds(benchmarkIds);
  const orchestratorFlowIds = allFlowRows
    .filter((r) => r.isOrchestrator)
    .map((r) => r.flowId);
  const latestRunByFlowId =
    orchestratorFlowIds.length > 0
      ? await getLatestRunByFlowId(orchestratorFlowIds, projectId)
      : {};

  const flowRowsByBenchmarkId = new Map<string, FlowRowWithBenchmarkId[]>();
  for (const row of allFlowRows) {
    const bucket = flowRowsByBenchmarkId.get(row.benchmarkId) ?? [];
    bucket.push(row);
    flowRowsByBenchmarkId.set(row.benchmarkId, bucket);
  }

  return new Map(
    benchmarkIds.map((id) => {
      const flowRows = flowRowsByBenchmarkId.get(id) ?? [];
      const orchestratorRun = findOrchestratorRun(flowRows, latestRunByFlowId);
      return [id, resolveOrchestratorStatus(orchestratorRun)];
    }),
  );
}

export async function listBenchmarks(params: {
  projectId: string;
  provider?: BenchmarkProviders;
}): Promise<BenchmarkListItem[]> {
  const { projectId, provider } = params;

  const rows = await benchmarkRepo().find({
    where: {
      projectId,
      deletedAt: IsNull(),
      ...(provider ? { provider } : {}),
    },
  });

  if (rows.length === 0) {
    return [];
  }

  const statusByBenchmarkId = await resolveStatusByBenchmarkId(
    rows.map((r) => r.id),
    projectId,
  );

  return rows.map((row) => ({
    benchmarkId: row.id,
    provider: row.provider,
    status: statusByBenchmarkId.get(row.id) ?? BenchmarkStatus.CREATED,
  }));
}

export async function getBenchmarkStatus(params: {
  benchmarkId: string;
  projectId: string;
}): Promise<BenchmarkStatusResponse> {
  const { benchmarkId, projectId } = params;

  const flowRows = await fetchFlowRowsByBenchmarkIds([benchmarkId]);

  if (flowRows.length === 0) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        entityType: 'Benchmark',
        entityId: benchmarkId,
      },
    });
  }

  const flowIds: string[] = [];
  let orchestratorFlowId: string | undefined;

  for (const r of flowRows) {
    flowIds.push(r.flowId);
    if (r.isOrchestrator) orchestratorFlowId = r.flowId;
  }

  const latestRunByFlowId =
    flowIds.length > 0 ? await getLatestRunByFlowId(flowIds, projectId) : {};

  const orchestratorRun = orchestratorFlowId
    ? latestRunByFlowId[orchestratorFlowId]
    : undefined;

  const workflows = buildWorkflowStatusItems(flowRows, latestRunByFlowId);

  return {
    benchmarkId,
    status: resolveOrchestratorStatus(orchestratorRun),
    workflows,
    lastRunId: orchestratorRun?.id,
    lastRunFinishedAt: orchestratorRun?.finishTime,
  };
}
