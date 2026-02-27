import {
  Button,
  StepCounter,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  WizardNext,
  WizardPrevious,
} from '@openops/components/ui';
import {
  BenchmarkCreationResult,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { t } from 'i18next';

import { WizardPhase } from '../use-benchmark-wizard-navigation';
import { ViewBenchmarkWorkflowsButton } from './view-benchmark-workflows-button';

interface BenchmarkWizardFooterProps {
  wizardPhase: WizardPhase;
  currentStepResponse: BenchmarkWizardStepResponse | null;
  benchmarkCreationResult: BenchmarkCreationResult | null;
  isNextDisabled: boolean;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
  handleEditSetup: () => void;
}

export const BenchmarkWizardFooter = ({
  wizardPhase,
  currentStepResponse,
  benchmarkCreationResult,
  isNextDisabled,
  handleNextFromInitial,
  handleNextFromProviderStep,
  handlePrevious,
  handleEditSetup,
}: BenchmarkWizardFooterProps) => {
  if (wizardPhase === 'benchmark-ready') {
    return (
      <div className="flex-1 flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleEditSetup}>
          {t('Edit setup')}
        </Button>
        {benchmarkCreationResult && (
          <ViewBenchmarkWorkflowsButton
            folderId={benchmarkCreationResult.folderId}
          />
        )}
        <Button size="sm" disabled>
          {t('Run now')}
        </Button>
      </div>
    );
  }

  if (wizardPhase === 'provider-step') {
    return (
      <>
        <WizardPrevious onPrevious={handlePrevious} />
        {currentStepResponse && (
          <StepCounter
            current={currentStepResponse.stepIndex}
            total={currentStepResponse.totalSteps}
          />
        )}
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
