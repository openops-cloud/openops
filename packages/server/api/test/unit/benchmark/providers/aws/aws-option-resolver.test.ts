import {
  BENCHMARK_PROVIDER_IMAGE_LOGO_URLS,
  BenchmarkProviders,
} from '@openops/shared';

import { resolveOptions } from '../../../../../src/app/benchmark/providers/aws/aws-option-resolver';

const mockListConnections = jest.fn();
const mockGetRegionsList = jest.fn();
jest.mock('../../../../../src/app/benchmark/common-resolvers', () => ({
  listConnections: (
    ...args: unknown[]
  ): ReturnType<typeof mockListConnections> => mockListConnections(...args),
}));
jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getRegionsList: (...args: unknown[]): ReturnType<typeof mockGetRegionsList> =>
    mockGetRegionsList(...args),
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
    const awsIcon = BENCHMARK_PROVIDER_IMAGE_LOGO_URLS[BenchmarkProviders.AWS];
    expect(result).toEqual([
      { id: '111111111111', displayName: 'Account One', imageLogoUrl: awsIcon },
      { id: '222222222222', displayName: 'Account Two', imageLogoUrl: awsIcon },
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

  it('delegates to getRegionsList and returns its result for getRegionsList', async () => {
    const regionsList = [
      { id: 'us-east-1', displayName: 'us-east-1 (US East (N. Virginia))' },
      { id: 'eu-west-1', displayName: 'eu-west-1 (Europe (Ireland))' },
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
      displayName: 'us-east-1 (US East (N. Virginia))',
    });
  });

  it('throws with method name in message for unknown method', async () => {
    await expect(
      resolveOptions('unknownMethod', { projectId, provider }),
    ).rejects.toThrow('Unknown AWS wizard option method: unknownMethod');
    expect(mockListConnections).not.toHaveBeenCalled();
  });
});
