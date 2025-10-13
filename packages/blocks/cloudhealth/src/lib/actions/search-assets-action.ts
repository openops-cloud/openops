import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { getAssetFields } from '../common/get-asset-fields';
import { getAssetTypes } from '../common/get-asset-types';
import { safeFetch } from '../common/safe-fetch';
import { searchAssets } from '../common/search-assets';

export const searchAssetsAction = createAction({
  name: 'cloudhealth_search_assets',
  displayName: 'Search Assets',
  description: 'Retrieve assets that match specific criteria',
  auth: cloudhealthAuth,
  isWriteAction: false,
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

        const {
          data: assetTypes,
          error,
          disabled,
        } = await safeFetch(() => getAssetTypes(auth));

        return {
          error: error,
          disabled: disabled,
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

        const {
          data: assetFields,
          error,
          disabled,
        } = await safeFetch(() =>
          getAssetFields(auth as any, assetType as unknown as string),
        );

        properties['fields'] = Property.Array({
          displayName: 'Fields to filter by',
          required: false,
          properties: {
            fieldName: Property.StaticDropdown<string>({
              displayName: 'Field name',
              required: true,
              options: {
                error: error,
                disabled: disabled,
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

    return await searchAssets(context.auth, assetType, fields);
  },
});
