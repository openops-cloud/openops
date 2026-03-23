import { ErrorCode, REGION_IMAGE_LOGO_URL } from '@openops/shared';

import { resolveOptions } from '../../../../../src/app/benchmark/providers/azure/azure-option-resolver';

const mockListConnections = jest.fn();
const mockAuthenticateUserWithAzure = jest.fn();
const mockGetAzureSubscriptionsList = jest.fn();
const mockGetAzureRegionsList = jest.fn();
const mockGetAuthProviderMetadata = jest.fn();

jest.mock('../../../../../src/app/benchmark/common-resolvers', () => ({
  ...jest.requireActual('../../../../../src/app/benchmark/common-resolvers'),
  listConnections: (
    ...args: unknown[]
  ): ReturnType<typeof mockListConnections> => mockListConnections(...args),
}));

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  authenticateUserWithAzure: (
    ...args: unknown[]
  ): ReturnType<typeof mockAuthenticateUserWithAzure> =>
    mockAuthenticateUserWithAzure(...args),
  getAzureSubscriptionsList: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetAzureSubscriptionsList> =>
    mockGetAzureSubscriptionsList(...args),
  getAzureRegionsList: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetAzureRegionsList> =>
    mockGetAzureRegionsList(...args),
}));

jest.mock(
  '../../../../../src/app/app-connection/connection-providers-resolver',
  () => ({
    getAuthProviderMetadata: (
      ...args: unknown[]
    ): ReturnType<typeof mockGetAuthProviderMetadata> =>
      mockGetAuthProviderMetadata(...args),
  }),
);

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

describe('resolveOptions (Azure)', () => {
  const projectId = 'project-123';
  const provider = 'azure';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to listConnections and returns its result for listConnections', async () => {
    const options = [
      {
        id: 'conn-1',
        displayName: 'Connection 1',
        metadata: { authProviderKey: 'Azure' },
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

  it('throws when getSubscriptionsList is called without a selected connection', async () => {
    await expect(
      resolveOptions('getSubscriptionsList', {
        projectId,
        provider,
      }),
    ).rejects.toThrow('Connection must be selected to list subscriptions');
    expect(mockGetOneOrThrow).not.toHaveBeenCalled();
  });

  it('returns subscriptions for getSubscriptionsList', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      authProviderKey: 'Azure',
      value: {
        type: 'CUSTOM_AUTH',
        props: {
          clientId: 'cid',
          clientSecret: 'secret',
          tenantId: 'tenant',
        },
      },
    });
    mockAuthenticateUserWithAzure.mockResolvedValue({
      access_token: 'token-1',
    });
    mockGetAzureSubscriptionsList.mockResolvedValue([
      {
        subscriptionId: 'sub-a',
        displayName: 'Sub A',
      },
      {
        subscriptionId: 'sub-b',
        displayName: 'Sub B',
      },
    ]);
    mockGetAuthProviderMetadata.mockResolvedValue({
      authProviderKey: 'Azure',
      authProviderLogoUrl: '/blocks/azure.svg',
    });

    const result = await resolveOptions('getSubscriptionsList', {
      projectId,
      provider,
      benchmarkConfiguration: { connection: ['conn-123'] },
    });

    expect(mockGetOneOrThrow).toHaveBeenCalledWith({
      id: 'conn-123',
      projectId,
    });
    expect(mockAuthenticateUserWithAzure).toHaveBeenCalledWith({
      clientId: 'cid',
      clientSecret: 'secret',
      tenantId: 'tenant',
    });
    expect(mockGetAzureSubscriptionsList).toHaveBeenCalledWith('token-1');
    expect(result).toEqual([
      {
        id: 'sub-a',
        displayName: 'Sub A',
        imageLogoUrl: '/blocks/azure.svg',
      },
      {
        id: 'sub-b',
        displayName: 'Sub B',
        imageLogoUrl: '/blocks/azure.svg',
      },
    ]);
  });

  it('omits imageLogoUrl for getSubscriptionsList when auth metadata has no logo', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      authProviderKey: 'Azure',
      value: {
        type: 'CUSTOM_AUTH',
        props: {
          clientId: 'cid',
          clientSecret: 'secret',
          tenantId: 'tenant',
        },
      },
    });
    mockAuthenticateUserWithAzure.mockResolvedValue({ access_token: 't' });
    mockGetAzureSubscriptionsList.mockResolvedValue([
      { subscriptionId: 'sub-1', displayName: 'One' },
    ]);
    mockGetAuthProviderMetadata.mockResolvedValue(undefined);

    const result = await resolveOptions('getSubscriptionsList', {
      projectId,
      provider,
      benchmarkConfiguration: { connection: ['c1'] },
    });

    expect(result).toEqual([{ id: 'sub-1', displayName: 'One' }]);
  });

  it('throws validation error when subscriptions list is empty', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      authProviderKey: 'Azure',
      value: {
        type: 'CUSTOM_AUTH',
        props: {
          clientId: 'client_id',
          clientSecret: 'client_secret',
          tenantId: 'tenant',
        },
      },
    });
    mockAuthenticateUserWithAzure.mockResolvedValue({ access_token: 't' });
    mockGetAzureSubscriptionsList.mockResolvedValue([]);

    const rejection = resolveOptions('getSubscriptionsList', {
      projectId,
      provider,
      benchmarkConfiguration: { connection: ['c1'] },
    });
    await expect(rejection).rejects.toMatchObject({
      error: { code: ErrorCode.VALIDATION },
    });
    await expect(rejection).rejects.toThrow(
      /No Azure subscriptions were returned for this connection/,
    );
  });

  it('throws validation error when subscription listing fails', async () => {
    mockGetOneOrThrow.mockResolvedValue({
      authProviderKey: 'Azure',
      value: {
        type: 'CUSTOM_AUTH',
        props: {
          clientId: 'client_id',
          clientSecret: 'client_secret',
          tenantId: 'tenant',
        },
      },
    });
    mockAuthenticateUserWithAzure.mockRejectedValue(new Error('token failed'));

    const rejection = resolveOptions('getSubscriptionsList', {
      projectId,
      provider,
      benchmarkConfiguration: { connection: ['c1'] },
    });
    await expect(rejection).rejects.toMatchObject({
      error: { code: ErrorCode.VALIDATION },
    });
    await expect(rejection).rejects.toThrow(
      /Unable to retrieve Azure subscriptions with the provided connection details/,
    );
  });

  it('delegates to getAzureRegionsList and returns options with imageLogoUrl for getRegionsList', async () => {
    const regionsList = [
      { id: 'eastus', displayName: 'East US' },
      { id: 'westus2', displayName: 'West US 2' },
    ];
    mockGetAzureRegionsList.mockReturnValue(regionsList);

    const result = await resolveOptions('getRegionsList', {
      projectId,
      provider,
    });

    expect(mockGetAzureRegionsList).toHaveBeenCalledTimes(1);
    expect(mockListConnections).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 'eastus',
        displayName: 'East US',
        imageLogoUrl: REGION_IMAGE_LOGO_URL,
      },
      {
        id: 'westus2',
        displayName: 'West US 2',
        imageLogoUrl: REGION_IMAGE_LOGO_URL,
      },
    ]);
  });

  it('throws with method name in message for unknown method', async () => {
    await expect(
      resolveOptions('unknownMethod', { projectId, provider }),
    ).rejects.toThrow('Unknown Azure wizard option method: unknownMethod');
    expect(mockListConnections).not.toHaveBeenCalled();
  });
});
