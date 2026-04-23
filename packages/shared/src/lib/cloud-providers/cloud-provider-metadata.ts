export type ProviderType = 'direct-cloud' | 'multi-cloud-finops';

export type SupportedCloudVendor = 'aws' | 'azure' | 'gcp';

export type CampaignProviderMetadata = {
  name: string;
  icon: string;
  authProviderKey: string;
  type: ProviderType;
  supportedVendors?: SupportedCloudVendor[];
};

export const CAMPAIGN_PROVIDER_METADATA: Record<
  string,
  CampaignProviderMetadata
> = {
  aws: {
    name: 'AWS',
    icon: '/blocks/aws.png',
    authProviderKey: 'AWS',
    type: 'direct-cloud',
  },
  azure: {
    name: 'Azure',
    icon: '/blocks/azure.svg',
    authProviderKey: 'Azure',
    type: 'direct-cloud',
  },
  gcp: {
    name: 'GCP',
    icon: '/blocks/google-cloud.svg',
    authProviderKey: 'GoogleCloud',
    type: 'direct-cloud',
  },
  cloudability: {
    name: 'Cloudability',
    icon: '/blocks/cloudability.png',
    authProviderKey: 'cloudability',
    type: 'multi-cloud-finops',
    supportedVendors: ['aws', 'azure', 'gcp'],
  },
};

export function getProviderMetadata(
  provider: string,
): CampaignProviderMetadata {
  return (
    CAMPAIGN_PROVIDER_METADATA[provider] || {
      name: 'Unknown',
      icon: '',
      authProviderKey: '',
      type: 'direct-cloud',
    }
  );
}

export function isMultiCloudProvider(provider: string): boolean {
  return getProviderMetadata(provider).type === 'multi-cloud-finops';
}

export function getSupportedVendors(provider: string): SupportedCloudVendor[] {
  return getProviderMetadata(provider).supportedVendors || [];
}
