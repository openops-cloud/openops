import {
  getProviderMetadata,
  getSupportedVendors,
  isMultiCloudProvider,
} from '../../src/lib/cloud-providers/cloud-provider-metadata';

describe('cloud-provider-metadata', () => {
  describe('getProviderMetadata', () => {
    it('should return metadata for known provider', () => {
      expect(getProviderMetadata('aws').name).toBe('AWS');
    });

    it('should return default metadata for unknown provider', () => {
      expect(getProviderMetadata('unknown').name).toBe('Unknown');
    });
  });

  describe('isMultiCloudProvider', () => {
    it('should return false for direct cloud providers', () => {
      expect(isMultiCloudProvider('aws')).toBe(false);
    });

    it('should return true for multi-cloud finops providers', () => {
      expect(isMultiCloudProvider('cloudability')).toBe(true);
    });
  });

  describe('getSupportedVendors', () => {
    it('should return empty array for direct cloud providers', () => {
      expect(getSupportedVendors('aws')).toEqual([]);
    });

    it('should return supported vendors for multi-cloud providers', () => {
      expect(getSupportedVendors('cloudability')).toHaveLength(3);
    });
  });
});
