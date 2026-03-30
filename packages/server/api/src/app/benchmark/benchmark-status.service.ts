import {
  ApplicationError,
  BenchmarkListItem,
  BenchmarkProviders,
  BenchmarkStatusResponse,
  BenchmarkWorkflowStatusItem,
  ErrorCode,
  BenchmarkStatus,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import {
  FlowRunSummary,
  getLatestRunByFlowId,
  resolveRunStatus,
} from '../flows/flow-run/flow-run-status.service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';

type FlowRow = {
  flowId: string;
  isOrchestrator: boolean;
  isCleanup: boolean;
  displayName: string | null;
};

type FlowRowWithBenchmarkId = FlowRow & { benchmarkId: string };

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
      'bf.isCleanup AS "isCleanup"',
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
      isCleanup: row.isCleanup,
      runStatus: latestRun
        ? resolveRunStatus(latestRun.status)
        : BenchmarkStatus.CREATED,
      runId: latestRun?.id,
    };
  });
}

function resolveOrchestratorStatus(
  run: FlowRunSummary | undefined,
): BenchmarkStatus {
  return run ? resolveRunStatus(run.status) : BenchmarkStatus.CREATED;
}

async function resolveStatusByBenchmarkId(
  benchmarkIds: string[],
  projectId: string,
): Promise<Map<string, BenchmarkStatus>> {
  const allFlowRows = await fetchFlowRowsByBenchmarkIds(benchmarkIds);

  const orchestratorFlowIdByBenchmarkId = new Map<string, string>();
  for (const row of allFlowRows) {
    if (row.isOrchestrator) {
      orchestratorFlowIdByBenchmarkId.set(row.benchmarkId, row.flowId);
    }
  }

  const orchestratorFlowIds = [...orchestratorFlowIdByBenchmarkId.values()];
  const latestRunByFlowId =
    orchestratorFlowIds.length > 0
      ? await getLatestRunByFlowId(orchestratorFlowIds, projectId)
      : {};

  const statusByBenchmarkId = new Map<string, BenchmarkStatus>();

  for (const benchmarkId of benchmarkIds) {
    const flowId = orchestratorFlowIdByBenchmarkId.get(benchmarkId);
    const latestOrchestratorRun = flowId
      ? latestRunByFlowId[flowId]
      : undefined;
    statusByBenchmarkId.set(
      benchmarkId,
      resolveOrchestratorStatus(latestOrchestratorRun),
    );
  }

  return statusByBenchmarkId;
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
