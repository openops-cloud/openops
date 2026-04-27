import { Vendor } from '@openops/common';
import { getRecommendationDurationProperty } from '../src/lib/common/common-properties';
import { Duration } from '../src/lib/common/recommendations-api';

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: propsValue,
  };
}

describe('getRecommendationDurationProperty', () => {
  let duration: any;
  let context: any;
  beforeEach(() => {
    duration = getRecommendationDurationProperty().duration;
    context = createContext();
  });

  test('disabled until vendor and recommendationType selected', async () => {
    const resultMissingVendor = await duration.options(
      {
        recommendationType: 'ec2',
      } as any,
      context,
    );
    expect(resultMissingVendor).toStrictEqual({
      disabled: true,
      options: [],
      placeholder: 'Select a vendor and recommendation type first',
    });

    const resultMissingType = await duration.options(
      {
        vendor: Vendor.AWS,
      } as any,
      context,
    );
    expect(resultMissingType).toStrictEqual({
      disabled: true,
      options: [],
      placeholder: 'Select a vendor and recommendation type first',
    });
  });

  test('AWS + s3 only allows 30 days', async () => {
    const result = await duration.options(
      {
        vendor: Vendor.AWS,
        recommendationType: 's3',
      } as any,
      context,
    );

    expect(result).toStrictEqual({
      disabled: false,
      options: [{ label: 'Last 30 Days', value: Duration.ThirtyDay }],
    });
  });

  test('other types allow 10 and 30 days', async () => {
    const result = await duration.options(
      {
        vendor: Vendor.AWS,
        recommendationType: 'ec2',
      } as any,
      context,
    );

    expect(result).toStrictEqual({
      disabled: false,
      options: [
        { label: 'Last 10 Days', value: Duration.TenDay },
        { label: 'Last 30 Days', value: Duration.ThirtyDay },
      ],
    });
  });
});
