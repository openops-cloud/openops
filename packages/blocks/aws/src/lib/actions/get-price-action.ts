import { AttributeValue, FilterType } from '@aws-sdk/client-pricing';
import { Property, createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  getAttributeValues,
  getCredentialsFromAuth,
  getPriceListWithCache,
  getServices,
} from '@openops/common';

const PRICING_REGION = 'us-east-1';

export const getPriceAction = createAction({
  auth: amazonAuth,
  name: 'get_price',
  description: 'Query AWS Pricing API to get the price of a service',
  displayName: 'Get Price from Price Catalog',
  props: {
    service: Property.Dropdown({
      displayName: 'Service Code',
      description: 'Service code for which to fetch the price',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }: any) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const credentials = await getCredentialsFromAuth(auth);
        try {
          const services = await getServices(credentials, PRICING_REGION);

          if (!services.length) {
            return {
              disabled: true,
              options: [],
              placeholder: 'No services found',
            };
          }

          return {
            disabled: false,
            options: services.map((service) => {
              return {
                label: service.ServiceCode!,
                value: service,
              };
            }),
          };
        } catch (error) {
          return {
            disabled: true,
            options: [],
            placeholder: 'An error occurred while fetching services',
            error: String(error),
          };
        }
      },
    }),
    queryFilters: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['auth', 'service'],
      props: async ({ auth, service }, { input }) => {
        if (!auth || !service) {
          return {};
        }

        const properties: { [key: string]: any } = {};
        const attributeNames: string[] = service['AttributeNames']!;

        properties['queryFilters'] = Property.Array({
          displayName: 'Filters',
          properties: {
            attributeName: Property.StaticDropdown({
              displayName: 'Attribute name',
              required: true,
              options: {
                options: attributeNames.map((attribute) => ({
                  label: attribute,
                  value: attribute,
                })),
              },
            }),
            attributeValue: Property.Dropdown({
              displayName: 'Attribute value',
              required: true,
              refreshers: ['attributeName'],
              options: async () => {
                const attributeName = input['attributeName'] as string;

                if (!attributeName) {
                  return {
                    options: [],
                  };
                }

                const credentials = await getCredentialsFromAuth(auth);
                try {
                  const attributeValues: AttributeValue[] =
                    await getAttributeValues(
                      credentials,
                      PRICING_REGION,
                      service['ServiceCode'],
                      attributeName,
                    );

                  return {
                    options: attributeValues.map((value) => ({
                      label: value.Value!,
                      value: value.Value!,
                    })),
                  };
                } catch (error) {
                  return {
                    options: [],
                    disabled: true,
                    placeholder:
                      'An error occurred while fetching attribute values',
                    error: String(error),
                  };
                }
              },
            }),
          },
          required: true,
          defaultValue: [],
        });

        return properties;
      },
    }),
  },
  async run(context) {
    try {
      const { service, queryFilters } = context.propsValue;
      const filters = queryFilters['queryFilters'].map((filter: any) => {
        return {
          Field: filter.attributeName,
          Type: FilterType.TERM_MATCH,
          Value: filter.attributeValue,
        };
      });

      const priceList = getPriceListWithCache(
        context.auth,
        service.ServiceCode!,
        filters,
        PRICING_REGION,
      );

      return priceList;
    } catch (error) {
      throw new Error('An error occurred while fetching prices: ' + error);
    }
  },
});
