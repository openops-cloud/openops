import {
  cn,
  SelectForm,
  SelectOption,
  StepBody,
  StepDescription,
  StepTitle,
} from '@openops/components/ui';
import { t } from 'i18next';

import { CLOUD_PROVIDERS, CloudProvider } from './cloud-providers';

interface InitialBenchmarkStepProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  onConnect?: (provider: string) => void;
  connectedProviders?: Record<string, boolean>;
}

const ReadMoreLink = () => (
  <button
    type="button"
    onClick={() => {
      // TODO: Link to documentation or info page
      window.open(
        'https://docs.openops.com/benchmark',
        '_blank',
        'noopener noreferrer',
      );
    }}
    className="text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
  >
    {t('Read more here')} →
  </button>
);

const ComingSoonLabel = () => (
  <>
    <div className="flex-1" />
    <span className="text-xs text-gray-500">{t('COMING SOON')}</span>
  </>
);

interface NotConnectedContentProps {
  name: string;
  onConnect: () => void;
}

const NotConnectedContent = ({ name, onConnect }: NotConnectedContentProps) => (
  <>
    <div className="flex items-center gap-2">
      <span>{name}</span>
      <span className="font-light hidden @[280px]:inline">
        {t('(Not connected)')}
      </span>
    </div>
    <div className="flex-1" />
    <button
      type="button"
      onClick={(e) => {
        // Prevent the parent SelectOption from being selected when clicking Connect
        e.preventDefault();
        e.stopPropagation();
        onConnect();
      }}
      className="text-primary-200 text-sm"
    >
      {t('Connect')}
    </button>
  </>
);

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
