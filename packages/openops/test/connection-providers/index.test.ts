import { connectionProviders } from '../../src/lib/connection-providers';
import { ConnectionProvider } from '../../src/lib/connection-providers/providers';
import { providerMap } from '../../src/lib/connection-providers/providers-map';

describe('connectionProviders', () => {
  describe('getAll', () => {
    it('should return all providers', () => {
      const result = connectionProviders.getAll();

      expect(result).toEqual(
        expect.arrayContaining(Object.values(providerMap)),
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getOne', () => {
    it('should return a specific provider by id', () => {
      const provider = connectionProviders.getOne(ConnectionProvider.AWS);

      expect(provider).toEqual(providerMap[ConnectionProvider.AWS]);
      expect(provider.id).toBe(ConnectionProvider.AWS);
      expect(provider.displayName).toBe('AWS');
      expect(provider.logoUrl).toContain('aws.png');
    });

    it('should return a specific provider for each ConnectionProvider enum value', () => {
      Object.values(ConnectionProvider).forEach((providerId) => {
        const provider = connectionProviders.getOne(providerId);

        expect(provider).toBeDefined();
        expect(provider.id).toBe(providerId);
        expect(provider.displayName).toBeDefined();
        expect(provider.logoUrl).toBeDefined();
      });
    });
  });
});
