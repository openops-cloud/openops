export interface CloudProvider {
  value: string;
  name: string;
  icon: string;
  enabled: boolean;
  authProviderKey: string;
}

export const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    value: 'aws',
    name: 'AWS',
    icon: '/blocks/aws.png',
    enabled: true,
    authProviderKey: 'AWS',
  },
  {
    value: 'azure',
    name: 'Azure',
    icon: '/blocks/azure.svg',
    enabled: false,
    authProviderKey: 'Azure',
  },
  {
    value: 'gcp',
    name: 'GCP',
    icon: '/blocks/google-cloud.svg',
    enabled: false,
    authProviderKey: 'GoogleCloud',
  },
];

export const getEnabledProviders = (): CloudProvider[] =>
  CLOUD_PROVIDERS.filter((p) => p.enabled);

export const getEnabledAuthProviders = (): string[] =>
  getEnabledProviders().map((p) => p.authProviderKey);

export const getProviderByValue = (
  value: string | null,
): CloudProvider | undefined => CLOUD_PROVIDERS.find((p) => p.value === value);
