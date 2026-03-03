import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import {
  BenchmarkRunPhase,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import {
  BenchmarkCreationResult,
  BenchmarkStatus,
  BenchmarkStatusResponse,
  BenchmarkWebhookPayload,
} from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { benchmarkApi } from './benchmark-api';

export type UseBenchmarkRunResult = {
  runPhase: BenchmarkRunPhase;
  runningProgress: { completed: number; total: number } | null;
  isRunPending: boolean;
  handleRunBenchmark: () => Promise<void>;
  handleResetRun: () => void;
  lastRunId: string | undefined;
};

function mapStatusToRunPhase(
  data: BenchmarkStatusResponse,
): BenchmarkRunPhase | null {
  switch (data.status) {
    case BenchmarkStatus.CREATED:
      return null;
    case BenchmarkStatus.RUNNING:
      return 'running';
    case BenchmarkStatus.FAILED:
      return 'failed';
    case BenchmarkStatus.SUCCEEDED: {
      const hasFailedSubWorkflow = data.workflows.some(
        (w) => !w.isOrchestrator && w.runStatus === BenchmarkStatus.FAILED,
      );
      return hasFailedSubWorkflow ? 'succeeded_with_failures' : 'succeeded';
    }
  }
}

export const useBenchmarkRun = (
  benchmarkCreateResult: BenchmarkCreationResult | null,
): UseBenchmarkRunResult => {
  const [runPhase, setRunPhase] = useState<BenchmarkRunPhase>('idle');
  const [lastRunId, setLastRunId] = useState<string | undefined>();
  const [runCount, setRunCount] = useState(0);

  const benchmarkId = benchmarkCreateResult?.benchmarkId ?? null;

  const {
    data: statusData,
    error: pollError,
    isError: isPollError,
  } = useQuery({
    queryKey: ['benchmark-status', benchmarkId, runCount],
    queryFn: () => benchmarkApi.getBenchmarkStatus(benchmarkId!),
    enabled: runPhase === 'running' && !!benchmarkId,
    refetchInterval: 5000,
    retry: 2,
  });

  useEffect(() => {
    if (isPollError && pollError) {
      console.error('[benchmark] Status polling failed:', pollError);
      toast(INTERNAL_ERROR_TOAST);
      setRunPhase('failed');
    }
  }, [isPollError, pollError]);

  useEffect(() => {
    if (!statusData) {
      return;
    }
    if (statusData.lastRunId) {
      setLastRunId(statusData.lastRunId);
    }
    const newPhase = mapStatusToRunPhase(statusData);
    if (newPhase !== null) {
      setRunPhase(newPhase);
    }
  }, [statusData]);

  const { mutateAsync: triggerRun, isPending: isRunPending } = useMutation({
    mutationFn: ({
      orchestratorFlowId,
      webhookPayload,
    }: {
      orchestratorFlowId: string;
      webhookPayload: BenchmarkWebhookPayload;
    }) => benchmarkApi.runBenchmark(orchestratorFlowId, webhookPayload),
    onSuccess: () => {
      setLastRunId(undefined);
      setRunCount((c) => c + 1);
      setRunPhase('running');
    },
    onError: handleMutationError,
  });

  const handleRunBenchmark = async () => {
    if (!benchmarkCreateResult) {
      return;
    }
    const orchestratorFlow = benchmarkCreateResult.workflows.find(
      (w) => w.isOrchestrator,
    );
    if (!orchestratorFlow) {
      return;
    }
    await triggerRun({
      orchestratorFlowId: orchestratorFlow.flowId,
      webhookPayload: benchmarkCreateResult.webhookPayload,
    });
  };

  const handleResetRun = () => {
    setRunPhase('idle');
    setLastRunId(undefined);
  };

  const runningProgress = useMemo(() => {
    if (runPhase !== 'running' || !statusData) {
      return null;
    }
    let completed = 0;
    let total = 0;
    for (const w of statusData.workflows) {
      if (w.isOrchestrator) {
        continue;
      }
      total++;
      if (
        w.runStatus === BenchmarkStatus.SUCCEEDED ||
        w.runStatus === BenchmarkStatus.FAILED
      ) {
        completed++;
      }
    }
    return { completed, total };
  }, [runPhase, statusData]);

  return {
    runPhase,
    runningProgress,
    isRunPending,
    handleRunBenchmark,
    handleResetRun,
    lastRunId,
  };
};
