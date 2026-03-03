import {
  BenchmarkRunPhase,
  Button,
  INTERNAL_ERROR_TOAST,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  WizardNext,
  WizardPrevious,
  toast,
} from '@openops/components/ui';
import { BenchmarkCreationResult } from '@openops/shared';
import { t } from 'i18next';

import { WizardPhase } from '../use-benchmark-wizard-navigation';
import { ViewBenchmarkWorkflowsButton } from './view-benchmark-workflows-button';

interface BenchmarkWizardFooterProps {
  wizardPhase: WizardPhase;
  runPhase: BenchmarkRunPhase;
  benchmarkCreationResult: BenchmarkCreationResult | null;
  isNextDisabled: boolean;
  isRunning: boolean;
  onRunNow: () => Promise<void>;
  onViewRun: () => void;
  onResetRun: () => void;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
  handleEditSetup: () => void;
}

export const BenchmarkWizardFooter = ({
  wizardPhase,
  runPhase,
  benchmarkCreationResult,
  isNextDisabled,
  isRunning,
  onRunNow,
  onViewRun,
  onResetRun,
  handleNextFromInitial,
  handleNextFromProviderStep,
  handlePrevious,
  handleEditSetup,
}: BenchmarkWizardFooterProps) => {
  if (wizardPhase === 'benchmark-ready') {
    if (runPhase === 'failed') {
      return (
        <div className="flex-1 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onViewRun}>
            {t('View run')}
          </Button>
          <Button size="sm" onClick={onResetRun}>
            {t('Run again')}
          </Button>
        </div>
      );
    }

    const hasOrchestrator = benchmarkCreationResult?.workflows.some(
      (w) => w.isOrchestrator,
    );

    return (
      <div className="flex-1 flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={isRunning}
          onClick={handleEditSetup}
        >
          {t('Edit setup')}
        </Button>
        {benchmarkCreationResult && (
          <ViewBenchmarkWorkflowsButton
            folderId={benchmarkCreationResult.folderId}
            disabled={isRunning}
          />
        )}
        <Button
          size="sm"
          disabled={!hasOrchestrator || isRunning}
          onClick={() => {
            onRunNow().catch((e) => {
              console.error(e);
              toast(INTERNAL_ERROR_TOAST);
            });
          }}
        >
          {t('Run now')}
        </Button>
      </div>
    );
  }

  if (wizardPhase === 'provider-step') {
    return (
      <>
        <WizardPrevious onPrevious={handlePrevious} />
        <WizardNext
          onNext={handleNextFromProviderStep}
          disabled={isNextDisabled}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild className="disabled:pointer-events-auto">
          <WizardNext
            onNext={handleNextFromInitial}
            disabled={isNextDisabled}
          />
        </TooltipTrigger>
        <TooltipContent>
          {isNextDisabled
            ? t('Need to connect to your account in order to proceed')
            : null}
        </TooltipContent>
      </Tooltip>
    </>
  );
};
