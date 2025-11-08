import { hyperglance } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(hyperglance.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'hyperglance',
      authProviderDisplayName: 'Hyperglance',
      authProviderLogoUrl: 'https://static.openops.com/blocks/hyperglance.svg',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(hyperglance.actions()).length).toBe(7);
    expect(hyperglance.actions()).toMatchObject({
      exportTopologyForGroup: {
        name: 'exportTopologyForGroup',
        requireAuth: true,
      },
      getCollectorRecordStatistics: {
        name: 'getCollectorRecordStatistics',
        requireAuth: true,
      },
      getCollectorRecordStatus: {
        name: 'getCollectorRecordStatus',
        requireAuth: true,
      },
      getRecommendations: {
        name: 'getRecommendations',
        requireAuth: true,
      },
      searchTopology: {
        name: 'searchTopology',
        requireAuth: true,
      },
      getCollectorRecords: {
        name: 'getCollectorRecords',
        requireAuth: true,
      },
      customHgApiCall: {
        name: 'customHgApiCall',
        requireAuth: true,
      }
    });
  });
});
