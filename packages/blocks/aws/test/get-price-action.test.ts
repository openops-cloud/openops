const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsFromAuth: jest.fn(),
  getAttributeValues: jest.fn(),
  getServices: jest.fn(),
  getPriceListWithCache: jest.fn(),
};

jest.mock('@openops/common', () => openopsCommonMock);

import { DropdownProperty, DynamicPropsValue } from '@openops/blocks-framework';
import { getPriceAction } from '../src/lib/actions/get-price-action';

describe('getPriceAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    openopsCommonMock.getCredentialsFromAuth.mockResolvedValue({
      someCreds: 'some value',
    });
  });

  const auth = {
    accessKeyId: 'some accessKeyId',
    secretAccessKey: 'some secretAccessKey',
    defaultRegion: 'some region',
  };

  const context = {
    ...jest.requireActual('@openops/blocks-framework'),
    server: {
      apiUrl: 'some url',
      token: 'some token',
    },
    auth: auth,
    propsValue: {
      accountId: 'some account id',
    },
  };

  test('should create action with correct properties', () => {
    expect(getPriceAction.props).toMatchObject({
      service: {
        type: 'DROPDOWN',
        required: true,
      },
      queryFilters: {
        type: 'DYNAMIC',
        required: true,
      },
    });
  });

  test.each([
    [[], []],
    [
      [{ attributeName: 'attribute', attributeValue: 'some value' }],
      [{ Field: 'attribute', Type: 'TERM_MATCH', Value: 'some value' }],
    ],
    [
      [
        { attributeName: 'attribute1', attributeValue: 'some value1' },
        { attributeName: 'attribute2', attributeValue: 'some value2' },
      ],
      [
        { Field: 'attribute1', Type: 'TERM_MATCH', Value: 'some value1' },
        { Field: 'attribute2', Type: 'TERM_MATCH', Value: 'some value2' },
      ],
    ],
  ])(
    'should use the correct filters and predefined region %p',
    async (selectedAttributes: any, expectedFilters: any[]) => {
      openopsCommonMock.getPriceListWithCache.mockResolvedValue('mockResult');

      context.propsValue.service = { ServiceCode: 'some service' };
      context.propsValue.queryFilters = { queryFilters: selectedAttributes };

      const result = (await getPriceAction.run(context)) as any;
      expect(result).toEqual('mockResult');

      expect(openopsCommonMock.getPriceListWithCache).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getPriceListWithCache).toHaveBeenCalledWith(
        auth,
        'some service',
        expectedFilters,
        'us-east-1',
      );
    },
  );

  test('should return the list of services in property service', async () => {
    openopsCommonMock.getServices.mockResolvedValue([
      { ServiceCode: 'service1' },
      { ServiceCode: 'service2' },
    ]);

    const result = await getPriceAction.props['service'].options(
      { auth },
      context,
    );

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'service1', value: { ServiceCode: 'service1' } },
        { label: 'service2', value: { ServiceCode: 'service2' } },
      ],
    });
  });

  test('should return the list of attribute values for the selected attribute name in property queryFilters', async () => {
    openopsCommonMock.getAttributeValues.mockResolvedValue([
      { Value: 'value1' },
      { Value: 'value2' },
    ]);

    context.propsValue.service = {
      ServiceCode: 'some service',
      AttributeNames: ['some attibute'],
    };
    context.propsValue.auth = auth;
    context.input = { attributeName: 'some attibute' };

    const queryFiltersDynamicProperty: DynamicPropsValue =
      await getPriceAction.props['queryFilters'].props(
        context.propsValue,
        context,
      );
    const attributeValueDropdownProperty = queryFiltersDynamicProperty[
      'queryFilters'
    ].properties['attributeValue'] as DropdownProperty<unknown, boolean>;
    const result = await attributeValueDropdownProperty.options(
      context.propsValue,
      context,
    );

    expect(result).toMatchObject({
      options: [
        { label: 'value1', value: 'value1' },
        { label: 'value2', value: 'value2' },
      ],
    });

    expect(openopsCommonMock.getAttributeValues).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getAttributeValues).toHaveBeenCalledWith(
      { someCreds: 'some value' },
      'us-east-1',
      'some service',
      'some attibute',
    );
  });
});
