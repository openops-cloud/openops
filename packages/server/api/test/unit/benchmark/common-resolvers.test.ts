import { AppConnectionStatus } from '@openops/shared';
import { listConnections } from '../../../src/app/benchmark/common-resolvers';

const mockList = jest.fn();
const mockGetAuthProviderMetadata = jest.fn();
jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      list: (...args: unknown[]): ReturnType<typeof mockList> =>
        mockList(...args),
    },
  }),
);
jest.mock(
  '../../../src/app/app-connection/connection-providers-resolver',
  () => ({
    getAuthProviderMetadata: (
      ...args: unknown[]
    ): ReturnType<typeof mockGetAuthProviderMetadata> =>
      mockGetAuthProviderMetadata(...args),
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
        authProviderKey: 'AWS',
      },
      {
        id: 'conn-2',
        name: 'Another Connection',
        authProviderKey: 'AWS',
      },
    ];
    mockList.mockResolvedValue({
      data: connections,
      next: null,
      previous: null,
    });
    const awsAuthLogo = '/blocks/aws.png';
    mockGetAuthProviderMetadata.mockResolvedValue({
      authProviderKey: 'AWS',
      authProviderLogoUrl: awsAuthLogo,
    });

    const result = await listConnections({ projectId, provider });

    expect(mockGetAuthProviderMetadata).toHaveBeenCalledTimes(1);
    expect(mockGetAuthProviderMetadata).toHaveBeenCalledWith('AWS', projectId);
    expect(result).toEqual([
      {
        id: 'conn-1',
        displayName: 'My AWS Connection',
        imageLogoUrl: awsAuthLogo,
        metadata: { authProviderKey: 'AWS' },
      },
      {
        id: 'conn-2',
        displayName: 'Another Connection',
        imageLogoUrl: awsAuthLogo,
        metadata: { authProviderKey: 'AWS' },
      },
    ]);
  });

  it('omits imageLogoUrl when auth metadata has no logo', async () => {
    mockList.mockResolvedValue({
      data: [
        { id: 'conn-1', name: 'Connection', authProviderKey: 'SomeProvider' },
      ],
      next: null,
      previous: null,
    });
    mockGetAuthProviderMetadata.mockResolvedValue(undefined);

    const result = await listConnections({ projectId, provider });

    expect(result).toEqual([
      {
        id: 'conn-1',
        displayName: 'Connection',
        metadata: { authProviderKey: 'SomeProvider' },
      },
    ]);
  });

  it('calls appConnectionService.list with expected params', async () => {
    mockList.mockResolvedValue({
      data: [{ id: 'conn-1', name: 'Connection', authProviderKey: 'AWS' }],
      next: null,
      previous: null,
    });
    mockGetAuthProviderMetadata.mockResolvedValue(undefined);

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

  it('throws when no connections found for provider', async () => {
    mockList.mockResolvedValue({ data: [], next: null, previous: null });

    await expect(listConnections({ projectId, provider })).rejects.toThrow(
      'No connections found for this provider',
    );
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
    expect(mockGetAuthProviderMetadata).not.toHaveBeenCalled();
  });

  it('throws when projectId is missing', async () => {
    await expect(listConnections({ projectId: '', provider })).rejects.toThrow(
      'projectId is required to list connections',
    );
    expect(mockList).not.toHaveBeenCalled();
  });
});
