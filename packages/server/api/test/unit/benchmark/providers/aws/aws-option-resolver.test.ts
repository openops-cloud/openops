import { resolveOptions } from '../../../../../src/app/benchmark/providers/aws/aws-option-resolver';

const mockListConnections = jest.fn();
jest.mock('../../../../../src/app/benchmark/common-resolvers', () => ({
  listConnections: (
    ...args: unknown[]
  ): ReturnType<typeof mockListConnections> => mockListConnections(...args),
}));

const mockGetOneOrThrow = jest.fn();
jest.mock(
  '../../../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      getOneOrThrow: (
        ...args: unknown[]
      ): ReturnType<typeof mockGetOneOrThrow> => mockGetOneOrThrow(...args),
    },
  }),
);

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

  it('throws when getConnectionAccounts is called without a selected connection', async () => {
    await expect(
      resolveOptions('getConnectionAccounts', {
        projectId,
        provider,
      }),
    ).rejects.toThrow('Connection must be selected to list accounts');
    expect(mockGetOneOrThrow).not.toHaveBeenCalled();
  });

  it('returns accounts from connection roles for getConnectionAccounts', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      value: {
        type: 'CUSTOM_AUTH',
        props: {
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ReadOnly',
              accountName: 'Account One',
            },
            {
              assumeRoleArn: 'arn:aws:iam::222222222222:role/ReadOnly',
              accountName: 'Account Two',
            },
          ],
        },
      },
    });

    const result = await resolveOptions('getConnectionAccounts', {
      projectId,
      provider,
      benchmarkConfiguration: {
        connection: ['conn-123'],
      },
    });

    expect(mockGetOneOrThrow).toHaveBeenCalledWith({
      id: 'conn-123',
      projectId,
    });
    expect(result).toEqual([
      { id: '111111111111', displayName: 'Account One' },
      { id: '222222222222', displayName: 'Account Two' },
    ]);
  });

  it('returns empty array for getConnectionAccounts when connection has no roles', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      value: { type: 'CUSTOM_AUTH', props: {} },
    });

    const result = await resolveOptions('getConnectionAccounts', {
      projectId,
      provider,
      benchmarkConfiguration: { connection: ['conn-456'] },
    });

    expect(mockGetOneOrThrow).toHaveBeenCalledWith({
      id: 'conn-456',
      projectId,
    });
    expect(result).toEqual([]);
  });

  it('throws with method name in message for unknown method', async () => {
    await expect(
      resolveOptions('unknownMethod', { projectId, provider }),
    ).rejects.toThrow('Unknown AWS wizard option method: unknownMethod');
    expect(mockListConnections).not.toHaveBeenCalled();
  });
});
