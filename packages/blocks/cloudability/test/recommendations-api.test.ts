import { HttpMethod } from '@openops/blocks-common';
import { Vendor } from '@openops/common';
import { CloudabilityAuth } from '../src/lib/auth';
import { makeRequest } from '../src/lib/common/make-request';
import {
  CostBasis,
  Duration,
  getRecommendations,
  SnoozedFilter,
  snoozeRecommendations,
  unsnoozeRecommendations,
} from '../src/lib/common/recommendations-api';

jest.mock('../src/lib/common/make-request');

const mockAuth: CloudabilityAuth = {
  apiKey: 'test-key',
  apiUrl: 'some-url',
};

describe('recommendations-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    test('calls makeRequest with correct params', async () => {
      (makeRequest as jest.Mock).mockResolvedValue(['rec1', 'rec2']);
      const result = await getRecommendations({
        auth: mockAuth,
        vendor: Vendor.AWS,
        recommendationType: 'rightsizing',
        duration: Duration.TenDay,
        limit: '10',
        filters: ['foo', 'bar'],
        basis: CostBasis.OnDemand,
        snoozedFilter: SnoozedFilter.NO_SNOOZED,
      });

      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: mockAuth,
          endpoint: '/rightsizing/AWS/recommendations/rightsizing',
          method: HttpMethod.GET,
          queryParams: expect.objectContaining({
            duration: Duration.TenDay,
            basis: CostBasis.OnDemand,
            filters: 'foo,bar',
            limit: '10',
            offset: '0',
          }),
        }),
      );
      expect(result).toEqual(['rec1', 'rec2']);
    });

    test('uses underutilized endpoint and omits basis for AWS Redshift', async () => {
      (makeRequest as jest.Mock).mockResolvedValue(['rec1']);
      const result = await getRecommendations({
        auth: mockAuth,
        vendor: Vendor.AWS,
        recommendationType: 'redshift',
        duration: Duration.TenDay,
        limit: '10',
        filters: ['foo'],
        basis: CostBasis.Effective,
        snoozedFilter: SnoozedFilter.NO_SNOOZED,
      });

      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: mockAuth,
          endpoint: '/rightsizing/AWS/underutilized/redshift',
          method: HttpMethod.GET,
          queryParams: expect.objectContaining({
            duration: Duration.TenDay,
            filters: 'foo',
            limit: '10',
            offset: '0',
          }),
        }),
      );
      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.not.objectContaining({
            basis: expect.anything(),
          }),
        }),
      );
      expect(result).toEqual(['rec1']);
    });

    test.each([undefined, null, '', 0, 'not-a-number'])(
      'omits limit if value is %s',
      async (limitValue) => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'rightsizing',
          duration: Duration.TenDay,
          limit: limitValue as any,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
        });

        expect(makeRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            queryParams: expect.not.objectContaining({
              limit: expect.anything(),
              offset: expect.anything(),
            }),
          }),
        );
      },
    );

    test('includes options if snoozedFilter is not NO_SNOOZED', async () => {
      (makeRequest as jest.Mock).mockResolvedValue([]);
      await getRecommendations({
        auth: mockAuth,
        vendor: Vendor.AWS,
        recommendationType: 'rightsizing',
        duration: Duration.TenDay,
        limit: '5',
        filters: [],
        basis: CostBasis.OnDemand,
        snoozedFilter: SnoozedFilter.INCLUDE_SNOOZED,
      });

      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            options: SnoozedFilter.INCLUDE_SNOOZED,
          }),
        }),
      );
    });

    it.each([
      [
        'comma-joins multiple ids',
        'ec2',
        '/rightsizing/AWS/recommendations/ec2',
        ['058264385171', '160153085320'],
        '058264385171,160153085320',
      ],
      [
        'preserves leading zeros (no numeric coercion)',
        'ec2',
        '/rightsizing/AWS/recommendations/ec2',
        ['058264385171'],
        '058264385171',
      ],
      [
        'targets the AWS redshift underutilized endpoint',
        'redshift',
        '/rightsizing/AWS/underutilized/redshift',
        ['058264385171'],
        '058264385171',
      ],
    ])(
      'includes vendorAccountIds query param: %s',
      async (_, recommendationType, endpoint, vendorAccountIds, expected) => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType,
          duration: Duration.ThirtyDay,
          limit: '1',
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds,
        });

        expect(makeRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint,
            queryParams: expect.objectContaining({
              vendorAccountIds: expected,
            }),
          }),
        );
      },
    );

    test.each([undefined, []])(
      'omits vendorAccountIds query param when value is %p',
      async (value) => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: '1',
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: value as string[] | undefined,
        });

        expect(makeRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            queryParams: expect.not.objectContaining({
              vendorAccountIds: expect.anything(),
            }),
          }),
        );
      },
    );

    describe('vendorAccountIds chunking', () => {
      // 903 12-digit AWS account IDs, mirroring the real-world 414 failure
      const manyAccountIds = Array.from({ length: 903 }, (_, i) =>
        String(i).padStart(12, '0'),
      );

      test('splits accounts into multiple requests when joined ids exceed the URL budget', async () => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        const calls = (makeRequest as jest.Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(1);

        const requestedIds: string[] = [];
        for (const [params] of calls) {
          const joined = params.queryParams.vendorAccountIds;
          expect(joined.length).toBeLessThanOrEqual(4000);
          requestedIds.push(...joined.split(','));
        }
        // every account is requested exactly once, preserving order
        expect(requestedIds).toEqual(manyAccountIds);
      });

      test('issues up to 2 chunked requests concurrently (pLimit(2))', async () => {
        const resolvers: Array<(value: unknown) => void> = [];
        (makeRequest as jest.Mock).mockImplementation(
          () => new Promise((resolve) => resolvers.push(resolve)),
        );

        const promise = getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        // flush microtasks so the initial fan-out settles without resolving any response
        await new Promise((resolve) => setImmediate(resolve));

        // pLimit(2) means exactly 2 requests are in-flight at this point, not all at once
        expect(resolvers).toHaveLength(2);

        // drain remaining batches: resolve each batch, flush so pLimit starts the next
        while (resolvers.length > 0) {
          resolvers.splice(0).forEach((resolve) => resolve([]));
          await new Promise((resolve) => setImmediate(resolve));
        }

        await promise;
      });

      test('keeps the non-account query params on every chunked request', async () => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: ['foo'],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.INCLUDE_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        const calls = (makeRequest as jest.Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(1);
        for (const [params] of calls) {
          expect(params).toEqual(
            expect.objectContaining({
              endpoint: '/rightsizing/AWS/recommendations/ec2',
              method: HttpMethod.GET,
              queryParams: expect.objectContaining({
                duration: Duration.ThirtyDay,
                basis: CostBasis.OnDemand,
                filters: 'foo',
                options: SnoozedFilter.INCLUDE_SNOOZED,
              }),
            }),
          );
        }
      });

      test('merges results from all chunked requests in request order', async () => {
        (makeRequest as jest.Mock)
          .mockResolvedValueOnce(['rec1', 'rec2'])
          .mockResolvedValueOnce(['rec3'])
          .mockResolvedValue(['rec4']);

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        const callCount = (makeRequest as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThan(1);
        expect(result).toEqual(
          ['rec1', 'rec2', 'rec3'].concat(Array(callCount - 2).fill('rec4')),
        );
      });

      test('applies the limit to the merged results when chunking', async () => {
        (makeRequest as jest.Mock).mockResolvedValue(['rec1', 'rec2', 'rec3']);

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: '4',
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        expect((makeRequest as jest.Mock).mock.calls.length).toBeGreaterThan(1);
        expect(result).toEqual(['rec1', 'rec2', 'rec3', 'rec1']);
      });

      test('makes a single request when joined ids fit within the URL budget', async () => {
        (makeRequest as jest.Mock).mockResolvedValue([]);
        await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds.slice(0, 100),
        });

        expect(makeRequest).toHaveBeenCalledTimes(1);
        expect(makeRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            queryParams: expect.objectContaining({
              vendorAccountIds: manyAccountIds.slice(0, 100).join(','),
            }),
          }),
        );
      });

      // The rightsizing API wraps the recommendations as { result: [...] };
      // downstream campaign templates consume the action output via ['result'].
      test('returns the API response verbatim when a single request is made', async () => {
        const apiResponse = { result: ['rec1'], totalResults: 1 };
        (makeRequest as jest.Mock).mockResolvedValue(apiResponse);

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds.slice(0, 100),
        });

        expect(makeRequest).toHaveBeenCalledTimes(1);
        expect(result).toBe(apiResponse);
      });

      test('merges result arrays from wrapped { result: [...] } responses when chunking', async () => {
        (makeRequest as jest.Mock)
          .mockResolvedValueOnce({ result: ['rec1', 'rec2'], totalResults: 2 })
          .mockResolvedValueOnce({ result: ['rec3'], totalResults: 1 })
          .mockResolvedValue({ result: ['rec4'], totalResults: 1 });

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        const callCount = (makeRequest as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThan(1);
        expect(result).toEqual({
          meta: { totalCount: callCount + 1 },
          result: ['rec1', 'rec2', 'rec3'].concat(
            Array(callCount - 2).fill('rec4'),
          ),
        });
      });

      test('applies the limit to merged wrapped results when chunking', async () => {
        (makeRequest as jest.Mock).mockResolvedValue({
          result: ['rec1', 'rec2', 'rec3'],
        });

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: '4',
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        const callCount = (makeRequest as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThan(1);
        // totalCount reflects everything fetched across chunks, not the slice.
        expect(result).toEqual({
          meta: { totalCount: callCount * 3 },
          result: ['rec1', 'rec2', 'rec3', 'rec1'],
        });
      });

      test('tolerates chunked responses with a missing result array', async () => {
        (makeRequest as jest.Mock)
          .mockResolvedValueOnce({ result: ['rec1'] })
          .mockResolvedValue({});

        const result = await getRecommendations({
          auth: mockAuth,
          vendor: Vendor.AWS,
          recommendationType: 'ec2',
          duration: Duration.ThirtyDay,
          limit: undefined,
          filters: [],
          basis: CostBasis.OnDemand,
          snoozedFilter: SnoozedFilter.NO_SNOOZED,
          vendorAccountIds: manyAccountIds,
        });

        expect((makeRequest as jest.Mock).mock.calls.length).toBeGreaterThan(1);
        expect(result).toEqual({
          meta: { totalCount: 1 },
          result: ['rec1'],
        });
      });
    });
  });

  describe('snoozeRecommendations', () => {
    test.each([
      ['never', 'never'],
      ['2025-12-31', '2025-12-31'],
      ['2024-01-01T00:00:00Z', '2024-01-01'],
    ])('calls makeRequest with correct body', async (snoozeUntil, expected) => {
      (makeRequest as jest.Mock).mockResolvedValue({ success: true });
      const result = await snoozeRecommendations({
        auth: mockAuth,
        vendor: Vendor.AWS,
        recommendationType: 'rightsizing',
        accountId: 'acc1',
        resourceIds: ['r1', 'r2'],
        snoozeUntil: snoozeUntil,
      });

      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/rightsizing/AWS/recommendations/rightsizing/snooze',
          method: HttpMethod.POST,
          body: {
            expiresOn: expected,
            resources: { acc1: ['r1', 'r2'] },
          },
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('unsnoozeRecommendations', () => {
    test('calls makeRequest with correct body', async () => {
      (makeRequest as jest.Mock).mockResolvedValue({ success: true });
      const result = await unsnoozeRecommendations({
        auth: mockAuth,
        vendor: Vendor.AWS,
        recommendationType: 'rightsizing',
        accountId: 'acc1',
        resourceIds: ['r1', 'r2'],
      });

      expect(makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/rightsizing/AWS/recommendations/rightsizing/unsnooze',
          method: HttpMethod.POST,
          body: {
            resources: { acc1: ['r1', 'r2'] },
          },
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });
});
