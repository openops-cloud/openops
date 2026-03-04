import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  WizardNext,
  WizardPrevious,
} from '@openops/components/ui';
import { BenchmarkCreationResult } from '@openops/shared';
import { t } from 'i18next';

import { WizardPhase } from '../use-benchmark-wizard-navigation';
import { ViewBenchmarkWorkflowsButton } from './view-benchmark-workflows-button';

interface BenchmarkWizardFooterProps {
  wizardPhase: WizardPhase;
  benchmarkCreationResult: BenchmarkCreationResult | null;
  isNextDisabled: boolean;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
  handleEditSetup: () => void;
}

export const BenchmarkWizardFooter = ({
  wizardPhase,
  benchmarkCreationResult,
  isNextDisabled,
  handleNextFromInitial,
  handleNextFromProviderStep,
  handlePrevious,
  handleEditSetup,
}: BenchmarkWizardFooterProps) => {
  if (wizardPhase === 'benchmark-ready') {
    return (
      <div className="@container flex-1 flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-w-0 @xs:flex-none"
          onClick={handleEditSetup}
        >
          {t('Edit setup')}
        </Button>
        {benchmarkCreationResult && (
          <ViewBenchmarkWorkflowsButton
            folderId={benchmarkCreationResult.folderId}
            className="flex-1 min-w-0 @xs:flex-none"
          />
        )}
        <Button size="sm" disabled className="w-full @xs:w-auto">
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
