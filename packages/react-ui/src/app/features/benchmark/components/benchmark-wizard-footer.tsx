import {
  Button,
  FOLDER_ID_PARAM_NAME,
  StepCounter,
  WizardNext,
  WizardPrevious,
} from '@openops/components/ui';
import {
  BenchmarkWizardStepResponse,
  CreateBenchmarkResponse,
} from '@openops/shared';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

import { WizardPhase } from '../use-benchmark-wizard-navigation';

interface BenchmarkWizardFooterProps {
  wizardPhase: WizardPhase;
  currentStepResponse: BenchmarkWizardStepResponse | null;
  createBenchmarkResult: CreateBenchmarkResponse | null;
  isNextDisabled: boolean;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
  handleEditSetup: () => void;
}

export const BenchmarkWizardFooter = ({
  wizardPhase,
  currentStepResponse,
  createBenchmarkResult,
  isNextDisabled,
  handleNextFromInitial,
  handleNextFromProviderStep,
  handlePrevious,
  handleEditSetup,
}: BenchmarkWizardFooterProps) => {
  const navigate = useNavigate();

  if (wizardPhase === 'benchmark-ready') {
    return (
      <>
        <Button variant="outline" size="sm" onClick={handleEditSetup}>
          {t('Edit setup')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(
              `/flows?${FOLDER_ID_PARAM_NAME}=${createBenchmarkResult?.folderId}`,
            )
          }
        >
          {t('View Workflows')}
        </Button>
        <Button size="sm" disabled>
          {t('Run now')}
        </Button>
      </>
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
      <WizardNext onNext={handleNextFromInitial} disabled={isNextDisabled} />
    </>
  );
};
