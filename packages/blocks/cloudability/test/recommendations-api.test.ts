import { HttpMethod } from '@openops/blocks-common';
import { CloudabilityAuth } from '../src/lib/auth';
import { makeRequest } from '../src/lib/common/make-request';
import {
  CostBasis,
  Duration,
  getRecommendations,
  SnoozedFilter,
  snoozeRecommendations,
  unsnoozeRecommendations,
  Vendor,
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
