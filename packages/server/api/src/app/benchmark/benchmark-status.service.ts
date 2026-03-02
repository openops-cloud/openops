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
import { BenchmarkSchema } from './benchmark.entity';
import { benchmarkRepo } from './benchmark.repo';

type FlowRow = {
  flowId: string;
  isOrchestrator: boolean;
  displayName: string | null;
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
      // SUCCEEDED, STOPPED
      return BenchmarkStatus.SUCCEEDED;
  }
}

async function fetchBenchmarkOrThrow(
  benchmarkId: string,
  projectId: string,
): Promise<BenchmarkSchema> {
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

  return benchmark;
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

async function resolveOverallStatus(
  lastRunId: string | null | undefined,
): Promise<{ status: BenchmarkStatus; lastRunFinishedAt?: string }> {
  if (!lastRunId) {
    return { status: BenchmarkStatus.IDLE };
  }

  const orchestratorRun = await flowRunRepo().findOneBy({ id: lastRunId });
  return {
    status: orchestratorRun
      ? mapFlowRunStatusToBenchmarkStatus(orchestratorRun.status)
      : BenchmarkStatus.IDLE,
    lastRunFinishedAt: orchestratorRun?.finishTime,
  };
}

function buildWorkflowStatusItems(
  flowRows: FlowRow[],
  latestRunByFlowId: Record<
    string,
    { id: string; status: FlowRunStatus } | undefined
  >,
): BenchmarkWorkflowStatusItem[] {
  return flowRows.map((row) => {
    const latestRun = latestRunByFlowId[row.flowId];
    return {
      flowId: row.flowId,
      displayName: row.displayName ?? '',
      isOrchestrator: row.isOrchestrator,
      runStatus: latestRun?.status ?? BenchmarkStatus.IDLE,
      runId: latestRun?.id,
    };
  });
}

async function getLatestRunByFlowId(
  flowIds: string[],
): Promise<Record<string, { id: string; status: FlowRunStatus } | undefined>> {
  if (flowIds.length === 0) {
    return {};
  }

  const rows = await flowRunRepo()
    .createQueryBuilder('fr')
    .innerJoin(
      (subQuery) =>
        subQuery
          .select('fr2.flowId', 'flowId')
          .addSelect('MAX(fr2.created)', 'maxCreated')
          .from('flow_run', 'fr2')
          .where('fr2.flowId IN (:...flowIds)', { flowIds })
          .groupBy('fr2.flowId'),
      'latest',
      'fr."flowId" = latest."flowId" AND fr.created = latest."maxCreated"',
    )
    .select('fr.id', 'id')
    .addSelect('fr.flowId', 'flowId')
    .addSelect('fr.status', 'status')
    .orderBy('fr.id', 'DESC')
    .getRawMany<{ id: string; flowId: string; status: FlowRunStatus }>();

  return pickFirstRunPerFlowId(rows);
}

function pickFirstRunPerFlowId(
  rows: { id: string; flowId: string; status: FlowRunStatus }[],
): Record<string, { id: string; status: FlowRunStatus } | undefined> {
  const result: Record<
    string,
    { id: string; status: FlowRunStatus } | undefined
  > = {};
  for (const row of rows) {
    // Rows are ordered by id DESC, so the first occurrence per flowId is the
    // deterministic tiebreaker winner when two runs share the same MAX(created).
    result[row.flowId] ??= { id: row.id, status: row.status };
  }
  return result;
}

export async function getBenchmarkStatus(params: {
  benchmarkId: string;
  projectId: string;
}): Promise<BenchmarkStatusResponse> {
  const { benchmarkId, projectId } = params;

  const benchmark = await fetchBenchmarkOrThrow(benchmarkId, projectId);
  const [flowRows, { status, lastRunFinishedAt }] = await Promise.all([
    fetchBenchmarkFlowRows(benchmarkId),
    resolveOverallStatus(benchmark.lastRunId),
  ]);
  const flowIds = flowRows.map((r) => r.flowId);
  const latestRunByFlowId = await getLatestRunByFlowId(flowIds);
  const workflows = buildWorkflowStatusItems(flowRows, latestRunByFlowId);

  return {
    benchmarkId,
    status,
    workflows,
    lastRunId: benchmark.lastRunId ?? undefined,
    lastRunFinishedAt,
  };
}
