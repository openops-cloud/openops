import { AppConnectionStatus } from '@openops/shared';
import { resolveOptions } from '../../../../../src/app/benchmark/providers/aws/aws-option-resolver';

const mockList = jest.fn();
jest.mock(
  '../../../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      list: (...args: unknown[]): ReturnType<typeof mockList> =>
        mockList(...args),
    },
  }),
);

describe('resolveOptions', () => {
  const projectId = 'project-123';
  const provider = 'aws';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns options mapped from app connection service list response for listConnections', async () => {
    const connections = [
      {
        id: 'conn-1',
        name: 'My AWS Connection',
        authProviderKey: 'aws',
      },
      {
        id: 'conn-2',
        name: 'Another Connection',
        authProviderKey: 'aws',
      },
    ];
    mockList.mockResolvedValue({
      data: connections,
      next: null,
      previous: null,
    });

    const result = await resolveOptions('listConnections', {
      projectId,
      provider,
    });

    expect(result).toEqual([
      {
        id: 'conn-1',
        displayName: 'My AWS Connection',
        metadata: { authProviderKey: 'aws' },
      },
      {
        id: 'conn-2',
        displayName: 'Another Connection',
        metadata: { authProviderKey: 'aws' },
      },
    ]);
  });

  it('calls appConnectionService.list with expected params for listConnections', async () => {
    mockList.mockResolvedValue({ data: [], next: null, previous: null });

    await resolveOptions('listConnections', { projectId, provider });

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith({
      projectId,
      authProviders: [provider],
      status: [AppConnectionStatus.ACTIVE],
      limit: 100,
      cursorRequest: null,
      name: undefined,
      connectionsIds: undefined,
    });
  });

  it('throws when projectId is missing for listConnections', async () => {
    await expect(
      resolveOptions('listConnections', { projectId: '', provider }),
    ).rejects.toThrow('projectId is required to list connections');
    expect(mockList).not.toHaveBeenCalled();
  });

  it('returns empty array for getConnectionAccounts', async () => {
    const result = await resolveOptions('getConnectionAccounts', {
      projectId,
      provider,
    });
    // Returns empty array until we implement the API (see getConnectionAccounts in aws-option-resolver).
    expect(result).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('throws with method name in message for unknown method', async () => {
    await expect(
      resolveOptions('unknownMethod', { projectId, provider }),
    ).rejects.toThrow('Unknown AWS wizard option method: unknownMethod');
    expect(mockList).not.toHaveBeenCalled();
  });
});
