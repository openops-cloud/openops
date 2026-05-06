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
    name: CLOUD_PROVIDER_METADATA.aws.name,
    icon: CLOUD_PROVIDER_METADATA.aws.icon,
    authProviderKey: CLOUD_PROVIDER_METADATA.aws.authProviderKey,
    enabled: true,
  },
  {
    value: 'azure',
    name: CLOUD_PROVIDER_METADATA.azure.name,
    icon: CLOUD_PROVIDER_METADATA.azure.icon,
    authProviderKey: CLOUD_PROVIDER_METADATA.azure.authProviderKey,
    enabled: true,
  },
  {
    value: 'gcp',
    name: CLOUD_PROVIDER_METADATA.gcp.name,
    icon: CLOUD_PROVIDER_METADATA.gcp.icon,
    authProviderKey: CLOUD_PROVIDER_METADATA.gcp.authProviderKey,
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
