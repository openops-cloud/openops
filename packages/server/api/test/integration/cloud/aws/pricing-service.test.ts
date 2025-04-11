jest.mock('lru-cache');
import LRUCache = require('lru-cache');

const cacheManagerMock = {
  get: jest.fn(),
  set: jest.fn(),
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(LRUCache as jest.MockedFunction<any>).mockImplementation(
  () => cacheManagerMock,
);

let getOrThrowMock = jest.fn().mockImplementation((key: AppSystemProp) => {
  if (key === AppSystemProp.AWS_PRICING_ACCESS_KEY_ID) {
    return 'access key';
  }
  if (key === AppSystemProp.AWS_PRICING_SECRET_ACCESS_KEY) {
    return 'secret access key';
  }

  return jest.requireActual('@openops/server-shared').system.getOrThrow(key);
});

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    ...jest.requireActual('@openops/server-shared').system,
    getOrThrow: getOrThrowMock,
  },
}));

const common = {
  ...jest.requireActual('@openops/common'),
  getPriceList: jest.fn(),
};

jest.mock('@openops/common', () => common);

import { Filter } from '@aws-sdk/client-pricing';
import { AppSystemProp } from '@openops/server-shared';
import { getPrice } from '../../../../src/app/aws/pricing-service';

describe('Pricing service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    test('should return cached value', async () => {
      cacheManagerMock.get.mockReturnValueOnce('some cached value');
      common.getPriceList.mockResolvedValue('a price list');
      const result = await getPrice(
        'EBS',
        [{ Field: 'location', Value: 'some value' }] as Filter[],
        'us-east-1',
      );

      expect(result).toEqual('some cached value');
      expect(cacheManagerMock.get).toHaveBeenCalledTimes(1);
      expect(cacheManagerMock.get).toHaveBeenCalledWith('EBS-some value');
    });

    test('should update cache if value is not already defined', async () => {
      cacheManagerMock.get.mockReturnValue(undefined);
      common.getPriceList.mockResolvedValue('a price list');
      const result = await getPrice(
        'EBS',
        [{ Field: 'location', Value: 'US East (N. Virginia)' }] as Filter[],
        'us-east-1',
      );

      expect(result).toEqual('a price list');
      expect(cacheManagerMock.get).toHaveBeenCalledTimes(1);
      expect(cacheManagerMock.get).toHaveBeenCalledWith(
        'EBS-US East (N. Virginia)',
      );
      expect(cacheManagerMock.set).toHaveBeenCalledTimes(1);
      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        'EBS-US East (N. Virginia)',
        'a price list',
      );
      expect(common.getPriceList).toHaveBeenCalledTimes(1);
      expect(common.getPriceList).toHaveBeenCalledWith(
        { accessKeyId: 'access key', secretAccessKey: 'secret access key' },
        'us-east-1',
        'EBS',
        [{ Field: 'location', Value: 'US East (N. Virginia)' }],
      );
    });

    test.each([
      [AppSystemProp.AWS_PRICING_ACCESS_KEY_ID, ''],
      [AppSystemProp.AWS_PRICING_SECRET_ACCESS_KEY, ''],
      [AppSystemProp.AWS_PRICING_ACCESS_KEY_ID, undefined],
      [AppSystemProp.AWS_PRICING_SECRET_ACCESS_KEY, undefined],
    ])(
      'should return an error if credentials are not defined',
      async (prop: AppSystemProp, value: string | undefined) => {
        getOrThrowMock = jest.fn().mockImplementation((key: AppSystemProp) => {
          if (key === prop) {
            return value;
          }

          if (
            key === AppSystemProp.AWS_PRICING_ACCESS_KEY_ID ||
            key === AppSystemProp.AWS_PRICING_SECRET_ACCESS_KEY
          ) {
            return 'some key';
          }

          return jest
            .requireActual('@openops/server-shared')
            .system.getOrThrow(key);
        });

        jest.resetModules();

        const { getPrice } = await import(
          '../../../../src/app/aws/pricing-service'
        );

        await expect(
          getPrice(
            'EBS',
            [{ Field: 'location', Value: 'some value' }] as Filter[],
            'us-east-1',
          ),
        ).rejects.toThrow(
          `System property OPS_${prop} is not defined in the .env file`,
        );
      },
    );
  });
});
