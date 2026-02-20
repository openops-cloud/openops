import {
  LoadingSpinner,
  StepCounter,
  Wizard,
  WizardClose,
  WizardContent,
  WizardFooter,
  WizardHeader,
  WizardNext,
  WizardPrevious,
  WizardStep,
  WizardTitle,
} from '@openops/components/ui';
import { CreateBenchmarkResponse } from '@openops/shared';
import { t } from 'i18next';
import { noop } from 'lodash-es';
import { useCallback, useState } from 'react';

import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { CreateOrEditConnectionDialog } from '@/app/features/connections/components/create-edit-connection-dialog';

import { CloudProvider, getProviderByValue } from '../cloud-providers';
import { useBenchmarkWizardNavigation } from '../use-benchmark-wizard-navigation';
import { useProviderConnections } from '../use-provider-connections';
import { DynamicBenchmarkStep } from './dynamic-benchmark-step/dynamic-benchmark-step';
import { InitialBenchmarkStep } from './initial-benchmark-step';

interface BenchmarkWizardProps {
  onClose: () => void;
  onBenchmarkCreated?: (result: CreateBenchmarkResponse) => void;
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
    isNextDisabled,
    handleNextFromInitial,
    handleNextFromProviderStep,
    handlePrevious,
  } = useBenchmarkWizardNavigation(connectedProviders, onBenchmarkCreated);

  const connectingProviderConfig = getProviderByValue(connectingProvider);

  const handleConnectionSaved = async () => {
    refetchConnections();
  };

  const handleCloseConnectionDialog = useCallback(
    () => setConnectingProvider(null),
    [],
  );

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
        className="border-l-0 border-t-0"
        value={wizardPhase}
        onValueChange={noop}
      >
        <WizardHeader className="min-h-[60px] bg-white border-gray-200">
          <WizardTitle>{t('Run a Benchmark')}</WizardTitle>
          <WizardClose onClose={onClose} />
        </WizardHeader>

        <WizardContent className="max-h-[358px]">
          {isCreatingBenchmark ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full py-12">
              <LoadingSpinner size={32} />
              <p className="text-sm text-muted-foreground">
                {t('Creating workflows for the Benchmark report')}
              </p>
            </div>
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
              <WizardStep value="provider-step" key="provider-step">
                {currentStepResponse && (
                  <DynamicBenchmarkStep
                    stepResponse={currentStepResponse}
                    value={currentSelections}
                    onValueChange={setCurrentSelections}
                  />
                )}
              </WizardStep>
            </>
          )}
        </WizardContent>

        <WizardFooter>
          {wizardPhase === 'provider-step' ? (
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
          ) : (
            <>
              <div className="flex-1" />
              <WizardNext
                onNext={handleNextFromInitial}
                disabled={isNextDisabled}
              />
            </>
          )}
        </WizardFooter>
      </Wizard>
    </div>
  );
};
