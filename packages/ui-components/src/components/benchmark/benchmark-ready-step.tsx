import { BenchmarkRunPhase } from '@/lib/types';
import { BenchmarkCreationResult } from '@openops/shared';
import { t } from 'i18next';
import { Link } from 'react-router-dom';
import { StepDescription } from '../../ui/wizard/wizard-step';
import { BenchmarkAnalyticsPhase } from './benchmark-analytics-phase';
import { BenchmarkFailedPhase } from './benchmark-failed-phase';
import { BenchmarkRunningPhase } from './benchmark-running-phase';
import { BenchmarkWorkflowList } from './benchmark-workflow-list';

export type FailedWorkflow = {
  displayName: string;
  runId?: string;
};

const FailedWorkflowsList = ({
  workflows,
}: {
  workflows: FailedWorkflow[];
}) => (
  <div className="flex flex-col gap-1 py-2">
    <p className="text-sm dark:text-muted-foreground font-medium">
      {t('The following workflows failed:')}
    </p>
    <ul className="list-disc pl-5 text-sm dark:text-muted-foreground">
      {workflows.map((workflow) => (
        <li key={workflow.displayName}>
          {workflow.runId ? (
            <Link
              to={`/runs/${workflow.runId}`}
              className="text-primary hover:underline"
            >
              {workflow.displayName}
            </Link>
          ) : (
            workflow.displayName
          )}
        </li>
      ))}
    </ul>
    <p className="text-sm dark:text-muted-foreground mt-1">
      {t('Click on a workflow name to review failure details.')}
    </p>
  </div>
);

interface BenchmarkReadyStepProps {
  providerName: string;
  result: BenchmarkCreationResult;
  runPhase: BenchmarkRunPhase;
  runningProgress?: { completed: number; total: number };
  failedWorkflows?: FailedWorkflow[];
}

export const BenchmarkReadyStep = ({
  providerName,
  result,
  runPhase,
  runningProgress,
  failedWorkflows,
}: BenchmarkReadyStepProps) => {
  const subWorkflows = result.workflows.filter(
    (w) => !w.isOrchestrator && !w.isCleanup,
  );

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

      <BenchmarkWorkflowList workflows={subWorkflows} provider={providerName} />

      {runPhase === 'running' && (
        <BenchmarkRunningPhase progress={runningProgress} />
      )}

      {runPhase === 'failed' && <BenchmarkFailedPhase />}

      {runPhase === 'succeeded_with_failures' && (
        <>
          <BenchmarkAnalyticsPhase
            provider={providerName}
            message={t(
              'You can access the Benchmark Report here. Note: results only cover services from workflows that ran successfully.',
            )}
          />
          {failedWorkflows && failedWorkflows.length > 0 && (
            <FailedWorkflowsList workflows={failedWorkflows} />
          )}
        </>
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
