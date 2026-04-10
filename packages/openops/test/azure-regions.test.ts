import { getAzureRegionsList } from '../src/lib/azure/regions';

describe('getAzureRegionsList', () => {
  it('returns non-empty array of region items', () => {
    const result = getAzureRegionsList();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns items with id and displayName', () => {
    const result = getAzureRegionsList();
    for (const item of result) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('displayName');
      expect(typeof item.id).toBe('string');
      expect(typeof item.displayName).toBe('string');
    }
  });

  it('includes known regions with correct display names', () => {
    const result = getAzureRegionsList();
    const eastUs = result.find((r) => r.id === 'eastus');
    const westEurope = result.find((r) => r.id === 'westeurope');
    expect(eastUs).toEqual({
      id: 'eastus',
      displayName: 'East US',
    });
    expect(westEurope).toEqual({
      id: 'westeurope',
      displayName: 'West Europe',
    });
  });
});
