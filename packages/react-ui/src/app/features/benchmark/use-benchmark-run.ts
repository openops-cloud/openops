import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import { BenchmarkRunPhase } from '@openops/components/ui';
import {
  BenchmarkCreationResult,
  BenchmarkStatus,
  BenchmarkStatusResponse,
  BenchmarkWebhookPayload,
} from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { benchmarkApi } from './benchmark-api';

export type UseBenchmarkRunResult = {
  runPhase: BenchmarkRunPhase;
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
      // Workflow run not registered yet — keep current state, continue polling
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

  const benchmarkId = benchmarkCreateResult?.benchmarkId ?? null;

  const { data: statusData } = useQuery({
    queryKey: ['benchmark-status', benchmarkId],
    queryFn: () => benchmarkApi.getBenchmarkStatus(benchmarkId!),
    enabled: runPhase === 'running' && !!benchmarkId,
    refetchInterval: 5000,
  });

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

  return {
    runPhase,
    isRunPending,
    handleRunBenchmark,
    handleResetRun,
    lastRunId,
  };
};
