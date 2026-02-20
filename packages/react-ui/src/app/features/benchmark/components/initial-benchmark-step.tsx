import {
  cn,
  SelectForm,
  SelectOption,
  StepBody,
  StepDescription,
  StepTitle,
} from '@openops/components/ui';
import { t } from 'i18next';

import { CLOUD_PROVIDERS, CloudProvider } from '../cloud-providers';
import { ComingSoonLabel } from './coming-soon-label';
import { NotConnectedContent } from './not-connected-content';
import { ReadMoreLink } from './read-more-link';

interface InitialBenchmarkStepProps {
  selectedProvider?: string;
  onProviderChange: (provider: string) => void;
  onConnect?: (provider: string) => void;
  connectedProviders?: Record<string, boolean>;
}

interface ProviderOptionContentProps {
  provider: CloudProvider;
  isConnected: boolean | undefined;
  onConnect?: (provider: string) => void;
}

const ProviderOptionContent = ({
  provider,
  isConnected,
  onConnect,
}: ProviderOptionContentProps) => {
  if (!provider.enabled) {
    return (
      <>
        <span>{provider.name}</span>
        <ComingSoonLabel />
      </>
    );
  }

  if (isConnected === false) {
    return (
      <NotConnectedContent
        name={provider.name}
        onConnect={() => onConnect?.(provider.value)}
      />
    );
  }

  return <span>{provider.name}</span>;
};

export const InitialBenchmarkStep = ({
  selectedProvider,
  onProviderChange,
  onConnect,
  connectedProviders,
}: InitialBenchmarkStepProps) => {
  return (
    <>
      <StepTitle>{t("Let's create your Benchmark Report!")}</StepTitle>
      <StepDescription className="!mt-0">
        <ReadMoreLink />
      </StepDescription>
      <StepDescription className="mt-4">
        {t(
          'In order to do so, we need to create your FinOps Benchmark Report of all your potential opportunities.',
        )}
        <br />
        {t('Which cloud provider do you use?')}
      </StepDescription>
      <StepBody>
        <SelectForm
          type="single"
          value={selectedProvider}
          onValueChange={onProviderChange}
        >
          <>
            {CLOUD_PROVIDERS.map((provider) => (
              <SelectOption
                key={provider.value}
                value={provider.value}
                icon={
                  <img
                    src={provider.icon}
                    alt={provider.name}
                    className="w-6 h-6 object-contain"
                  />
                }
                disabled={!provider.enabled}
                className={cn('@container', {
                  'justify-between': provider.enabled,
                  'justify-between opacity-50': !provider.enabled,
                })}
              >
                <ProviderOptionContent
                  provider={provider}
                  isConnected={connectedProviders?.[provider.value]}
                  onConnect={onConnect}
                />
              </SelectOption>
            ))}
          </>
        </SelectForm>
      </StepBody>
    </>
  );
};
