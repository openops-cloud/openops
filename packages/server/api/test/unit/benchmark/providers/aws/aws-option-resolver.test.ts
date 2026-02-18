import { resolveOptions } from '../../../../../src/app/benchmark/providers/aws/aws-option-resolver';

const mockListConnections = jest.fn();
const mockGetRegionsList = jest.fn();
jest.mock('../../../../../src/app/benchmark/common-resolvers', () => ({
  listConnections: (
    ...args: unknown[]
  ): ReturnType<typeof mockListConnections> => mockListConnections(...args),
}));
jest.mock('@openops/common', () => ({
  getRegionsList: (...args: unknown[]): ReturnType<typeof mockGetRegionsList> =>
    mockGetRegionsList(...args),
}));

describe('resolveOptions', () => {
  const projectId = 'project-123';
  const provider = 'aws';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to listConnections and returns its result for listConnections', async () => {
    const options = [
      {
        id: 'conn-1',
        displayName: 'Connection 1',
        metadata: { authProviderKey: 'aws' },
      },
    ];
    mockListConnections.mockResolvedValue(options);

    const result = await resolveOptions('listConnections', {
      projectId,
      provider,
    });

    expect(mockListConnections).toHaveBeenCalledTimes(1);
    expect(mockListConnections).toHaveBeenCalledWith({ projectId, provider });
    expect(result).toEqual(options);
  });

  it('returns empty array for getConnectionAccounts', async () => {
    const result = await resolveOptions('getConnectionAccounts', {
      projectId,
      provider,
    });
    // Returns empty array until we implement the API (see getConnectionAccounts in aws-option-resolver).
    expect(result).toEqual([]);
    expect(mockListConnections).not.toHaveBeenCalled();
  });

  it('delegates to getRegionsList and returns its result for getRegionsList', async () => {
    const regionsList = [
      { id: 'us-east-1', displayName: 'US East (N. Virginia)' },
      { id: 'eu-west-1', displayName: 'Europe (Ireland)' },
    ];
    mockGetRegionsList.mockReturnValue(regionsList);

    const result = await resolveOptions('getRegionsList', {
      projectId,
      provider,
    });

    expect(mockGetRegionsList).toHaveBeenCalledTimes(1);
    expect(mockListConnections).not.toHaveBeenCalled();
    expect(result).toEqual(regionsList);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'us-east-1',
      displayName: 'US East (N. Virginia)',
    });
  });

  it('throws with method name in message for unknown method', async () => {
    await expect(
      resolveOptions('unknownMethod', { projectId, provider }),
    ).rejects.toThrow('Unknown AWS wizard option method: unknownMethod');
    expect(mockListConnections).not.toHaveBeenCalled();
  });
});
