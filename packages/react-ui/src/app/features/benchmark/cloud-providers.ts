import { CLOUD_PROVIDER_METADATA } from '@openops/shared';

export type CloudProviderValue = 'aws' | 'azure' | 'gcp';

export type CloudProvider = {
  value: CloudProviderValue;
  name: string;
  icon: string;
  enabled: boolean;
  authProviderKey: string;
};

export const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    value: 'aws',
    ...CLOUD_PROVIDER_METADATA.aws,
    enabled: true,
  },
  {
    value: 'azure',
    ...CLOUD_PROVIDER_METADATA.azure,
    enabled: true,
  },
  {
    value: 'gcp',
    ...CLOUD_PROVIDER_METADATA.gcp,
    enabled: false,
  },
];

export const getEnabledProviders = (): CloudProvider[] =>
  CLOUD_PROVIDERS.filter((p) => p.enabled);

export const getEnabledAuthProviders = (): string[] =>
  getEnabledProviders().map((p) => p.authProviderKey);

export const getProviderByValue = (
  value: CloudProviderValue | null,
): CloudProvider | undefined => CLOUD_PROVIDERS.find((p) => p.value === value);
