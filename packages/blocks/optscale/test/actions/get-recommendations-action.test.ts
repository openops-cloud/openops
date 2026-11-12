import { HttpMethod } from '@openops/blocks-common';
import { getRecommendationsAction } from '../../src/lib/actions/get-recommendations-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  ...jest.requireActual('../../src/lib/common/make-request'),
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

function mockResponses(optimizations: Record<string, unknown>) {
  sendMock
    .mockResolvedValueOnce({ id: 'org-1', currency: 'USD' })
    .mockResolvedValueOnce({
      optimizations: {},
      dismissed_optimizations: {},
      excluded_optimizations: {},
      ...optimizations,
    });
}

const baseProps = {
  organizationId: 'org-1',
  recommendationTypes: ['rightsizing_instances', 's3_public_buckets'],
  status: 'active',
};

describe('getRecommendationsAction', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requests the selected types with filters', async () => {
    mockResponses({});

    await getRecommendationsAction.run(
      createContext({
        ...baseProps,
        cloudAccountIds: ['ca-1', 'ca-2'],
        limit: 10,
      }),
    );

    expect(sendMock).toHaveBeenNthCalledWith(1, {
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1',
    });
    expect(sendMock).toHaveBeenNthCalledWith(2, {
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/optimizations',
      query: {
        type: ['rightsizing_instances', 's3_public_buckets'],
        cloud_account_id: ['ca-1', 'ca-2'],
        status: 'active',
        limit: 10,
      },
    });
  });

  test('flattens groups, annotates items and sorts by saving', async () => {
    mockResponses({
      optimizations: {
        rightsizing_instances: {
          count: 2,
          saving: 30,
          items: [
            { resource_id: 'r-1', saving: 10 },
            { resource_id: 'r-2', saving: 20 },
          ],
        },
        s3_public_buckets: {
          count: 1,
          saving: 0,
          items: [{ resource_id: 'r-3' }],
        },
      },
    });

    const result = await getRecommendationsAction.run(createContext(baseProps));

    expect(result).toEqual([
      {
        resource_id: 'r-2',
        saving: 20,
        recommendationType: 'rightsizing_instances',
        category: 'cost',
        currency: 'USD',
      },
      {
        resource_id: 'r-1',
        saving: 10,
        recommendationType: 'rightsizing_instances',
        category: 'cost',
        currency: 'USD',
      },
      {
        resource_id: 'r-3',
        recommendationType: 's3_public_buckets',
        category: 'security',
        currency: 'USD',
      },
    ]);
  });

  test('reads dismissed recommendations from the dismissed group', async () => {
    mockResponses({
      optimizations: {
        rightsizing_instances: { items: [{ resource_id: 'active' }] },
      },
      dismissed_optimizations: {
        rightsizing_instances: { items: [{ resource_id: 'dismissed' }] },
      },
    });

    const result = await getRecommendationsAction.run(
      createContext({ ...baseProps, status: 'dismissed' }),
    );

    expect(result).toEqual([
      expect.objectContaining({ resource_id: 'dismissed' }),
    ]);
  });

  test('drops items below the minimum saving', async () => {
    mockResponses({
      optimizations: {
        rightsizing_instances: {
          items: [
            { resource_id: 'small', saving: 4.99 },
            { resource_id: 'large', saving: 5 },
          ],
        },
      },
    });

    const result = await getRecommendationsAction.run(
      createContext({ ...baseProps, minSaving: 5 }),
    );

    expect(result).toEqual([expect.objectContaining({ resource_id: 'large' })]);
  });

  test('handles groups without items and a missing status group', async () => {
    sendMock.mockResolvedValueOnce({ id: 'org-1' }).mockResolvedValueOnce({
      optimizations: { rightsizing_instances: { count: 0, error: 'x' } },
    });

    await expect(
      getRecommendationsAction.run(createContext(baseProps)),
    ).resolves.toEqual([]);

    sendMock
      .mockResolvedValueOnce({ id: 'org-1' })
      .mockResolvedValueOnce({ optimizations: {} });

    await expect(
      getRecommendationsAction.run(
        createContext({ ...baseProps, status: 'excluded' }),
      ),
    ).resolves.toEqual([]);
  });

  test('rejects an invalid limit before calling the API', async () => {
    await expect(
      getRecommendationsAction.run(createContext({ ...baseProps, limit: 2.5 })),
    ).rejects.toThrow('Limit per Type must be a whole number of at least 1');
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('encodes the organization ID in paths', async () => {
    mockResponses({});

    await getRecommendationsAction.run(
      createContext({ ...baseProps, organizationId: 'org/../x' }),
    );

    expect(sendMock.mock.calls[1][0].path).toBe(
      '/organizations/org%2F..%2Fx/optimizations',
    );
  });

  test('is a read-only action', () => {
    expect(getRecommendationsAction.isWriteAction).toBe(false);
    expect(getRecommendationsAction.props).toMatchObject({
      recommendationTypes: { required: true },
      status: { defaultValue: 'active' },
    });
  });
});
