import { BenchmarkRunPhase } from '@/lib/types';
import { CreateBenchmarkResponse } from '@openops/shared';
import { t } from 'i18next';
import { StepDescription } from '../../ui/wizard/wizard-step';
import { BenchmarkAnalyticsPhase } from './benchmark-analytics-phase';
import { BenchmarkFailedPhase } from './benchmark-failed-phase';
import { BenchmarkRunningPhase } from './benchmark-running-phase';
import { BenchmarkWorkflowList } from './benchmark-workflow-list';

interface BenchmarkReadyStepProps {
  providerName: string;
  result: CreateBenchmarkResponse;
  runPhase: BenchmarkRunPhase;
  onViewRun: () => void;
  onResetRun: () => void;
}

export const BenchmarkReadyStep = ({
  providerName,
  result,
  runPhase,
  onViewRun,
  onResetRun,
}: BenchmarkReadyStepProps) => {
  const orchestrator = result.workflows.find((w) => w.isOrchestrator);
  const subWorkflows = result.workflows.filter((w) => !w.isOrchestrator);
  const displayedWorkflows = [
    ...(orchestrator ? [orchestrator] : []),
    ...subWorkflows,
  ];

  return (
    <>
      <StepDescription>
        <p>
          <b>
            {t('Your {provider} Benchmark is ready to run.', {
              provider: providerName,
            })}
          </b>
        </p>
        {t("We've created the required workflows in the")}{' '}
        <strong>
          &ldquo;{providerName} {t('Benchmark')}&rdquo;
        </strong>{' '}
        {t(
          'folder. You can run the full benchmark now or execute individual workflows at any time.',
        )}
      </StepDescription>

      {runPhase === 'idle' && (
        <BenchmarkWorkflowList
          workflows={displayedWorkflows}
          provider={providerName}
        />
      )}

      {runPhase === 'running' && <BenchmarkRunningPhase />}

      {runPhase === 'failed' && (
        <BenchmarkFailedPhase onViewRun={onViewRun} onResetRun={onResetRun} />
      )}

      {runPhase === 'succeeded_with_failures' && (
        <BenchmarkAnalyticsPhase
          provider={providerName}
          message={t(
            "You can review your Benchmark Report here (it's not final since there are some failed workflows)",
          )}
        />
      )}

      {runPhase === 'succeeded' && (
        <BenchmarkAnalyticsPhase
          provider={providerName}
          message={t('Your Benchmark Report is ready, you can review it here:')}
        />
      )}
    </>
  );
};

BenchmarkReadyStep.displayName = 'BenchmarkReadyStep';
