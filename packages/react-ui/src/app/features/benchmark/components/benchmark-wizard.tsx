import {
  BenchmarkCreatingPlaceholder,
  BenchmarkReadyStep,
  Wizard,
  WizardClose,
  WizardContent,
  WizardFooter,
  WizardHeader,
  WizardStep,
  WizardTitle,
} from '@openops/components/ui';
import { BenchmarkCreationResult } from '@openops/shared';
import { t } from 'i18next';
import { noop } from 'lodash-es';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { CreateOrEditConnectionDialog } from '@/app/features/connections/components/create-edit-connection-dialog';

import { CloudProvider, getProviderByValue } from '../cloud-providers';
import { useBenchmarkRun } from '../use-benchmark-run';
import { useBenchmarkWizardNavigation } from '../use-benchmark-wizard-navigation';
import { useProviderConnections } from '../use-provider-connections';
import { BenchmarkWizardFooter } from './benchmark-wizard-footer';
import { DynamicBenchmarkStep } from './dynamic-benchmark-step/dynamic-benchmark-step';
import { InitialBenchmarkStep } from './initial-benchmark-step';

interface BenchmarkWizardProps {
  onClose: () => void;
  onBenchmarkCreated?: (result: BenchmarkCreationResult) => void;
}

interface ProviderConnectionDialogProps {
  providerConfig: CloudProvider;
  onSaved: () => Promise<void>;
  onClose: () => void;
}

const ProviderConnectionDialog = ({
  providerConfig,
  onSaved,
  onClose,
}: ProviderConnectionDialogProps) => (
  <DynamicFormValidationProvider>
    <CreateOrEditConnectionDialog
      authProviderKey={providerConfig.authProviderKey}
      connectionToEdit={null}
      reconnect={false}
      onConnectionSaved={onSaved}
      open={true}
      setOpen={(open) => {
        if (!open) onClose();
      }}
    />
  </DynamicFormValidationProvider>
);

export const BenchmarkWizard = ({
  onClose,
  onBenchmarkCreated,
}: BenchmarkWizardProps) => {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null,
  );

  const { connectedProviders, refetchConnections } = useProviderConnections();

  const {
    selectedProvider,
    setSelectedProvider,
    wizardPhase,
    currentStepResponse,
    currentSelections,
    setCurrentSelections,
    isCreatingBenchmark,
    benchmarkCreateResult,
    isNextDisabled,
    handleNextFromInitial,
    handleNextFromProviderStep,
    handlePrevious,
    handleEditSetup,
  } = useBenchmarkWizardNavigation(connectedProviders, onBenchmarkCreated);

  const navigate = useNavigate();

  const {
    runPhase,
    runningProgress,
    failedWorkflows,
    isRunPending,
    handleRunBenchmark,
    handleResetRun,
    lastRunId,
  } = useBenchmarkRun(benchmarkCreateResult);

  const connectingProviderConfig = getProviderByValue(connectingProvider);
  const selectedProviderConfig = getProviderByValue(selectedProvider ?? null);
  const providerName = selectedProviderConfig?.name ?? '';

  const handleConnectionSaved = async () => {
    refetchConnections();
  };

  const handleCloseConnectionDialog = useCallback(
    () => setConnectingProvider(null),
    [],
  );

  const handleViewRun = () => {
    if (lastRunId) {
      navigate(`/runs/${lastRunId}`);
    }
  };

  const handleEditSetupAndResetRun = () => {
    handleResetRun();
    handleEditSetup();
  };

  return (
    <div className="h-full w-full flex flex-col bg-greyBlue-100 dark:bg-background">
      {connectingProviderConfig && (
        <ProviderConnectionDialog
          providerConfig={connectingProviderConfig}
          onSaved={handleConnectionSaved}
          onClose={handleCloseConnectionDialog}
        />
      )}
      <Wizard
        className="border-l-0 border-t-0 pb-9"
        value={wizardPhase}
        onValueChange={noop}
      >
        <WizardHeader className="min-h-[60px] bg-white border-gray-200">
          <WizardTitle>{t('Run a Benchmark')}</WizardTitle>
          <WizardClose onClose={onClose} />
        </WizardHeader>

        <WizardContent className="flex flex-col overflow-hidden">
          {isCreatingBenchmark ? (
            <BenchmarkCreatingPlaceholder />
          ) : (
            <>
              <WizardStep value="initial" key="initial">
                <InitialBenchmarkStep
                  selectedProvider={selectedProvider}
                  onProviderChange={setSelectedProvider}
                  onConnect={setConnectingProvider}
                  connectedProviders={connectedProviders}
                />
              </WizardStep>
              <WizardStep
                value="provider-step"
                key="provider-step"
                className="flex flex-col flex-1 min-h-0"
              >
                {currentStepResponse && (
                  <DynamicBenchmarkStep
                    stepResponse={currentStepResponse}
                    value={currentSelections}
                    stepBodyClassName="relative flex-1 min-h-0 overflow-y-auto"
                    onValueChange={setCurrentSelections}
                  />
                )}
              </WizardStep>
              <WizardStep
                value="benchmark-ready"
                key="benchmark-ready"
                className="flex flex-col flex-1 min-h-0"
              >
                {benchmarkCreateResult && (
                  <BenchmarkReadyStep
                    providerName={providerName}
                    result={benchmarkCreateResult}
                    runPhase={runPhase}
                    runningProgress={runningProgress ?? undefined}
                    failedWorkflows={failedWorkflows}
                  />
                )}
              </WizardStep>
            </>
          )}
        </WizardContent>

        <WizardFooter>
          <BenchmarkWizardFooter
            wizardPhase={wizardPhase}
            runPhase={runPhase}
            benchmarkCreationResult={benchmarkCreateResult}
            isNextDisabled={isNextDisabled}
            isRunning={runPhase === 'running' || isRunPending}
            handleNextFromInitial={handleNextFromInitial}
            handleNextFromProviderStep={handleNextFromProviderStep}
            handlePrevious={handlePrevious}
            handleEditSetup={handleEditSetupAndResetRun}
            onRunNow={handleRunBenchmark}
            onViewRun={handleViewRun}
            onRunAgain={handleRunBenchmark}
          />
        </WizardFooter>
      </Wizard>
    </div>
  );
};
