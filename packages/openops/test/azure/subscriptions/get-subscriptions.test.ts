const systemMock = {
  getOrThrow: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  AppSystemProp: {
    AZURE_API_VERSION: 'AZURE_API_VERSION',
  },
  system: systemMock,
}));

const makeAzureGetMock = jest.fn();
const createAxiosHeadersForAzureMock = jest.fn();
jest.mock('../../../src/lib/azure/request-helper', () => ({
  makeAzureGet: makeAzureGetMock,
  createAxiosHeadersForAzure: createAxiosHeadersForAzureMock,
}));

import { getAzureSubscriptionsList } from '../../../src/lib/azure/subscription/get-subscriptions';

describe('getAzureSubscriptionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return subscription list', async () => {
    systemMock.getOrThrow.mockReturnValue('some api version');
    createAxiosHeadersForAzureMock.mockReturnValue('some header');
    makeAzureGetMock.mockResolvedValue([
      { value: [{ subscriptionId: 'id1', displayName: 'test1' }] },
      {
        value: [
          { subscriptionId: 'id2', displayName: 'test2' },
          { subscriptionId: 'id3', displayName: 'test3' },
        ],
      },
    ]);

    const result = await getAzureSubscriptionsList('token');

    expect(systemMock.getOrThrow).toHaveBeenCalledTimes(1);
    expect(systemMock.getOrThrow).toHaveBeenCalledWith('AZURE_API_VERSION');
    expect(makeAzureGetMock).toHaveBeenCalledTimes(1);
    expect(makeAzureGetMock).toHaveBeenCalledWith(
      'subscriptions?api-version=some api version',
      'some header',
    );
    expect(result).toEqual([
      { subscriptionId: 'id1', displayName: 'test1' },
      { subscriptionId: 'id2', displayName: 'test2' },
      { subscriptionId: 'id3', displayName: 'test3' },
    ]);
  });
});
