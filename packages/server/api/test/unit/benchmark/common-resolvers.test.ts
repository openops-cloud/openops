import { AppConnectionStatus } from '@openops/shared';
import { listConnections } from '../../../src/app/benchmark/common-resolvers';

const mockList = jest.fn();
jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      list: (...args: unknown[]): ReturnType<typeof mockList> =>
        mockList(...args),
    },
  }),
);

describe('listConnections', () => {
  const projectId = 'project-123';
  const provider = 'aws';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns options mapped from app connection service list response', async () => {
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

    const result = await listConnections({ projectId, provider });

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

  it('calls appConnectionService.list with expected params', async () => {
    mockList.mockResolvedValue({ data: [], next: null, previous: null });

    await listConnections({ projectId, provider });

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

  it('throws when projectId is missing', async () => {
    await expect(listConnections({ projectId: '', provider })).rejects.toThrow(
      'projectId is required to list connections',
    );
    expect(mockList).not.toHaveBeenCalled();
  });
});
