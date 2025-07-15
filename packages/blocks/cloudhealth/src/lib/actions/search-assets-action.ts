import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { BASE_CH_URL } from '../common/base-url';
import { getAssetTypes } from '../common/get-asset-types';

const BASE_ASSET_URL = `${BASE_CH_URL}/api`;

export const searchAssetsAction = createAction({
  name: 'cloudhealth_search_assets',
  displayName: 'Search Assets',
  description: 'Retrieve assets that match specific criteria',
  auth: cloudhealthAuth,
  props: {
    assetType: Property.Dropdown({
      displayName: 'Asset Type',
      description: 'The type of asset to fetch metadata for.',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }: any) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const assetTypes = await getAssetTypes(auth);

        return {
          options: assetTypes.map((type) => ({
            label: type,
            value: type,
          })),
        };
      },
    }),
    fields: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['assetType'],
      props: async ({ auth, assetType }) => {
        if (!assetType) {
          return {};
        }
        const properties: { [key: string]: any } = {};

        const assetFields = await getAssetFields(
          auth as any,
          assetType as unknown as string,
        );

        properties['fields'] = Property.Array({
          displayName: 'Fields to filter by',
          required: false,
          properties: {
            fieldName: Property.StaticDropdown<string>({
              displayName: 'Field name',
              required: true,
              options: {
                options: assetFields.map((f) => ({
                  label: f.name,
                  value: f.name,
                })),
              },
            }),
            value: Property.ShortText({
              displayName: 'Value to search for',
              required: true,
            }),
          },
        });
        return properties;
      },
    }),
  },
  async run(context) {
    const { assetType, fields } = context.propsValue as {
      assetType: string;
      fields: { fieldName: string; value: string }[];
    };

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `${BASE_ASSET_URL}/search`,
      headers: {
        Authorization: `Bearer ${context.auth}`,
        'Content-Type': 'application/json',
      },
      queryParams: {
        name: assetType,
        query: ((fields as any).fields ?? [])
          .map((f: any) => `${f.fieldName}='${f.value}'`)
          .join('&'),
        api_version: '2',
      },
    });

    return response;
  },
});

async function getAssetFields(
  apiKey: string,
  assetType: string,
): Promise<{ name: string; type: string }[]> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: `${BASE_ASSET_URL}/${assetType}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  return response.body?.attributes?.map((field: any) => ({
    name: field.name,
    type: field.type,
  }));
}
