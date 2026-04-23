import {
  CAMPAIGN_PROVIDER_METADATA,
  getProviderMetadata,
  getSupportedVendors,
  isMultiCloudProvider,
} from '../../src/lib/cloud-providers/cloud-provider-metadata';

describe('cloud-provider-metadata', () => {
  describe('CAMPAIGN_PROVIDER_METADATA', () => {
    it('should contain metadata for aws', () => {
      expect(CAMPAIGN_PROVIDER_METADATA['aws']).toEqual({
        name: 'AWS',
        icon: '/blocks/aws.png',
        authProviderKey: 'AWS',
        type: 'direct-cloud',
      });
    });

    it('should contain metadata for azure', () => {
      expect(CAMPAIGN_PROVIDER_METADATA['azure']).toEqual({
        name: 'Azure',
        icon: '/blocks/azure.svg',
        authProviderKey: 'Azure',
        type: 'direct-cloud',
      });
    });

    it('should contain metadata for gcp', () => {
      expect(CAMPAIGN_PROVIDER_METADATA['gcp']).toEqual({
        name: 'GCP',
        icon: '/blocks/google-cloud.svg',
        authProviderKey: 'GoogleCloud',
        type: 'direct-cloud',
      });
    });

    it('should contain metadata for cloudability', () => {
      expect(CAMPAIGN_PROVIDER_METADATA['cloudability']).toEqual({
        name: 'Cloudability',
        icon: '/blocks/cloudability.png',
        authProviderKey: 'cloudability',
        type: 'multi-cloud-finops',
        supportedVendors: ['aws', 'azure', 'gcp'],
      });
    });
  });

  describe('getProviderMetadata', () => {
    it('should return metadata for known provider', () => {
      const metadata = getProviderMetadata('aws');
      expect(metadata).toEqual({
        name: 'AWS',
        icon: '/blocks/aws.png',
        authProviderKey: 'AWS',
        type: 'direct-cloud',
      });
    });

    it('should return metadata for cloudability', () => {
      const metadata = getProviderMetadata('cloudability');
      expect(metadata).toEqual({
        name: 'Cloudability',
        icon: '/blocks/cloudability.png',
        authProviderKey: 'cloudability',
        type: 'multi-cloud-finops',
        supportedVendors: ['aws', 'azure', 'gcp'],
      });
    });

    it('should return default metadata for unknown provider', () => {
      const metadata = getProviderMetadata('unknown');
      expect(metadata).toEqual({
        name: 'Unknown',
        icon: '',
        authProviderKey: '',
        type: 'direct-cloud',
      });
    });
  });

  describe('isMultiCloudProvider', () => {
    it('should return false for direct cloud providers', () => {
      expect(isMultiCloudProvider('aws')).toBe(false);
      expect(isMultiCloudProvider('azure')).toBe(false);
      expect(isMultiCloudProvider('gcp')).toBe(false);
    });

    it('should return true for multi-cloud finops providers', () => {
      expect(isMultiCloudProvider('cloudability')).toBe(true);
    });

    it('should return false for unknown providers', () => {
      expect(isMultiCloudProvider('unknown')).toBe(false);
    });
  });

  describe('getSupportedVendors', () => {
    it('should return empty array for direct cloud providers', () => {
      expect(getSupportedVendors('aws')).toEqual([]);
      expect(getSupportedVendors('azure')).toEqual([]);
      expect(getSupportedVendors('gcp')).toEqual([]);
    });

    it('should return supported vendors for multi-cloud providers', () => {
      expect(getSupportedVendors('cloudability')).toEqual([
        'aws',
        'azure',
        'gcp',
      ]);
    });

    it('should return empty array for unknown providers', () => {
      expect(getSupportedVendors('unknown')).toEqual([]);
    });
  });
});
