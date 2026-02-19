import {
  Wizard,
  WizardClose,
  WizardContent,
  WizardFooter,
  WizardHeader,
  WizardNext,
  WizardStep,
  WizardTitle,
} from '@openops/components/ui';
import { BenchmarkConfiguration } from '@openops/shared';
import { t } from 'i18next';
import { noop } from 'lodash-es';
import { useState } from 'react';

import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { CreateOrEditConnectionDialog } from '@/app/features/connections/components/create-edit-connection-dialog';

import { CloudProvider, getProviderByValue } from './cloud-providers';
import { InitialBenchmarkStep } from './initial-benchmark-step';
import { useProviderConnections } from './use-provider-connections';

interface BenchmarkWizardProps {
  provider?: 'aws' | 'azure';
  onClose: () => void;
  onComplete?: (config: BenchmarkConfiguration) => void;
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
  provider: initialProvider,
  onClose,
  onComplete: _onComplete,
}: BenchmarkWizardProps) => {
  const [selectedProvider, setSelectedProvider] = useState<string>(
    initialProvider || '',
  );
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null,
  );

  const { connectedProviders } = useProviderConnections();

  const connectingProviderConfig = getProviderByValue(connectingProvider);

  const isSelectedProviderConnected =
    !!selectedProvider && connectedProviders[selectedProvider] === true;

  const handleProviderConnect = (provider: string) => {
    setConnectingProvider(provider);
  };

  const handleConnectionSaved = async () => {
    setConnectingProvider(null);
  };

  const handleConnectionDialogClose = () => {
    setConnectingProvider(null);
  };

  return (
    <div className="h-full w-full flex flex-col bg-greyBlue-100 dark:bg-background">
      {connectingProviderConfig && (
        <ProviderConnectionDialog
          providerConfig={connectingProviderConfig}
          onSaved={handleConnectionSaved}
          onClose={handleConnectionDialogClose}
        />
      )}
      <Wizard
        className="border-l-0 border-t-0"
        value="initial"
        onValueChange={noop}
      >
        <WizardHeader className="min-h-[60px] bg-white border-gray-200">
          <WizardTitle>{t('Run a Benchmark')}</WizardTitle>
          <WizardClose onClose={onClose} />
        </WizardHeader>

        <WizardContent className="max-h-[358px]">
          <WizardStep value="initial" key="initial">
            <InitialBenchmarkStep
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              onConnect={handleProviderConnect}
              connectedProviders={connectedProviders}
            />
          </WizardStep>
        </WizardContent>

        <WizardFooter>
          <WizardNext disabled={!isSelectedProviderConnected} />
        </WizardFooter>
      </Wizard>
    </div>
  );
};
