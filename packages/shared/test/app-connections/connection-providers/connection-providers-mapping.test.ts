import { Provider } from '../../../src/lib/app-connection/connection-providers';
import {
  getAllConnectionProviders,
  getConnectionProvider,
  providerMap,
} from '../../../src/lib/app-connection/connection-providers-mapping';

describe('connectionProviders', () => {
  describe('getAll', () => {
    it('should return all providers', () => {
      const result = getAllConnectionProviders();

      expect(result).toEqual(
        expect.arrayContaining(Object.values(providerMap)),
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getOne', () => {
    it('should return a specific provider by id', () => {
      const provider = getConnectionProvider(Provider.AWS);

      expect(provider).toEqual(providerMap[Provider.AWS]);
      expect(provider.id).toBe(Provider.AWS);
      expect(provider.displayName).toBe('AWS');
      expect(provider.logoUrl).toContain('aws.png');
    });

    it('should return a specific provider for each ConnectionProvider enum value', () => {
      Object.values(Provider).forEach((providerId) => {
        const provider = getConnectionProvider(providerId);

        expect(provider).toBeDefined();
        expect(provider.id).toBe(providerId);
        expect(provider.displayName).toBeDefined();
        expect(provider.logoUrl).toBeDefined();
      });
    });
  });
});
