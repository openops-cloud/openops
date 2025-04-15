const getAttributeValuesCommandMock = jest.fn();
const describeServicesCommandMock = jest.fn();
const getProductsCommandMock = jest.fn();

jest.mock('@aws-sdk/client-pricing', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-pricing'),
    GetAttributeValuesCommand: getAttributeValuesCommandMock,
    DescribeServicesCommand: describeServicesCommandMock,
    GetProductsCommand: getProductsCommandMock,
  };
});

const makeAwsRequestMock = jest.fn();
jest.mock('../../src/lib/aws/aws-client-wrapper', () => ({
  makeAwsRequest: makeAwsRequestMock,
}));

const getAwsClientMock = jest.fn();
jest.mock('../../src/lib/aws/get-client', () => {
  return {
    getAwsClient: getAwsClientMock,
  };
});

const cacheWrapperMock = {
  getOrAdd: jest.fn(),
};
jest.mock('@openops/server-shared', () => ({
  cacheWrapper: cacheWrapperMock,
}));

import { Filter, FilterType, Pricing } from '@aws-sdk/client-pricing';
import {
  getAttributeValues,
  getPriceListFromAws,
  getPriceListWithCache,
  getServices,
} from '../../src/lib/aws/pricing';

describe('pricing tests', () => {
  const auth = {
    someUser: 'some value',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAwsClientMock.mockReturnValue('mockClient');
  });

  describe('getServices', () => {
    test('should make requests with the correct params', async () => {
      makeAwsRequestMock.mockResolvedValue([{ Services: ['service1'] }]);

      await getServices('credentials', 'us-east-1');

      expect(getAwsClientMock).toHaveBeenCalledTimes(1);
      expect(getAwsClientMock).toHaveBeenCalledWith(
        Pricing,
        'credentials',
        'us-east-1',
      );
      expect(describeServicesCommandMock).toHaveBeenCalledTimes(1);
      expect(describeServicesCommandMock).toHaveBeenCalledWith({});
      expect(makeAwsRequestMock).toHaveBeenCalledTimes(1);
      expect(makeAwsRequestMock).toHaveBeenCalledWith(
        'mockClient',
        expect.anything(),
      );
    });

    test('should return the aggregated services', async () => {
      makeAwsRequestMock.mockResolvedValue([
        { Services: ['service1'] },
        { Services: [] },
        { Services: ['service2', 'service3'] },
      ]);

      const result = await getServices('credentials', 'us-east-1');

      expect(result).toEqual(['service1', 'service2', 'service3']);
    });

    test('should return an empty array if no services are found', async () => {
      makeAwsRequestMock.mockResolvedValue([{ Services: [] }]);

      const result = await getServices('credentials', 'us-east-1');

      expect(result).toEqual([]);
    });
  });

  describe('getAttributeValues', () => {
    test('should make requests with the correct params', async () => {
      makeAwsRequestMock.mockResolvedValue([{ AttributeValues: ['value1'] }]);

      await getAttributeValues(
        'credentials',
        'us-east-1',
        'some service',
        'some attribute',
      );

      expect(getAwsClientMock).toHaveBeenCalledTimes(1);
      expect(getAwsClientMock).toHaveBeenCalledWith(
        Pricing,
        'credentials',
        'us-east-1',
      );
      expect(getAttributeValuesCommandMock).toHaveBeenCalledTimes(1);
      expect(getAttributeValuesCommandMock).toHaveBeenCalledWith({
        ServiceCode: 'some service',
        AttributeName: 'some attribute',
      });
      expect(makeAwsRequestMock).toHaveBeenCalledTimes(1);
      expect(makeAwsRequestMock).toHaveBeenCalledWith(
        'mockClient',
        expect.anything(),
      );
    });

    test('should return the aggregated attribute values', async () => {
      makeAwsRequestMock.mockResolvedValue([
        { AttributeValues: ['value1'] },
        { AttributeValues: [] },
        { AttributeValues: ['value2', 'value3'] },
      ]);

      const result = await getAttributeValues(
        'credentials',
        'us-east-1',
        'some service',
        'some attribute',
      );

      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    test('should return an empty array if no services are found', async () => {
      makeAwsRequestMock.mockResolvedValue([{ AttributeValues: [] }]);

      const result = await getAttributeValues(
        'credentials',
        'us-east-1',
        'some service',
        'some attribute',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getPriceListFromAws', () => {
    test('should return price list for the given filters and append extracted price without random ids', async () => {
      getAwsClientMock.mockReturnValue({
        getProducts: getProductsCommandMock,
      });
      getProductsCommandMock.mockResolvedValueOnce({
        PriceList: [
          JSON.stringify({
            terms: {
              OnDemand: {
                randomValue: {
                  priceDimensions: {
                    somePriceDimensionId: {
                      pricePerUnit: {
                        USD: 5,
                      },
                    },
                  },
                },
              },
            },
          }),
        ],
      });

      const filters = [
        {
          Field: 'some field',
          Type: FilterType.TERM_MATCH,
          Value: 'some value',
        },
      ];
      const result = await getPriceListFromAws(
        'credentials',
        'us-east-1',
        'some service',
        filters,
      );

      expect(result).toStrictEqual([
        {
          pricePerUnit: {
            USD: 5,
          },
          terms: {
            OnDemand: {
              randomValue: {
                priceDimensions: {
                  somePriceDimensionId: {
                    pricePerUnit: {
                      USD: 5,
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      expect(getProductsCommandMock).toHaveBeenCalledTimes(1);
      expect(getProductsCommandMock).toHaveBeenCalledWith({
        ServiceCode: 'some service',
        Filters: [
          { Field: 'some field', Type: 'TERM_MATCH', Value: 'some value' },
        ],
      });
    });

    test.each([undefined, null, []])(
      'should throw if no prices were retrieved for the given values',
      async (returnedPriceList: unknown) => {
        getProductsCommandMock.mockResolvedValueOnce({
          PriceList: returnedPriceList,
        });

        getAwsClientMock.mockReturnValue({
          getProducts: getProductsCommandMock,
        });

        const result = await getPriceListFromAws(
          'credentials',
          'us-east-1',
          'some service',
          [],
        );

        expect(result).toStrictEqual([]);

        expect(getProductsCommandMock).toHaveBeenCalledTimes(1);
        expect(getProductsCommandMock).toHaveBeenCalledWith({
          ServiceCode: 'some service',
          Filters: [],
        });
      },
    );
  });

  describe('getPrice', () => {
    test('should get or add to cache wrapper', async () => {
      cacheWrapperMock.getOrAdd.mockReturnValueOnce('some cached value');
      const result = await getPriceListWithCache(
        auth,
        'EBS',
        [{ Field: 'location', Value: 'some value' }] as Filter[],
        'us-east-1',
      );

      expect(result).toEqual('some cached value');
      expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledTimes(1);
      expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledWith(
        'EBS-some value',
        getPriceListFromAws,
        [
          { someUser: 'some value' },
          'us-east-1',
          'EBS',
          [{ Field: 'location', Value: 'some value' }],
        ],
      );
    });
  });
});
