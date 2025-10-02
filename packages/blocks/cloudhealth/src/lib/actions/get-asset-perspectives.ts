import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { getAssetFields } from '../common/get-asset-fields';
import { getAssetTypes } from '../common/get-asset-types';
import { safeFetch } from '../common/safe-fetch';
import { searchAssets } from '../common/search-assets';

export const getAssetPerspectivesAction = createAction({
  name: 'cloudhealth_get_asset_perspectives',
  displayName: 'Get Asset Perspectives',
  description: 'Retrieve perspectives for a specific asset',
  auth: cloudhealthAuth,
  requireToolApproval: false,
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

    const assets: any[] = await searchAssets(context.auth, assetType, fields);
    const results = [];

    if (!assets || assets.length === 0) {
      throw new Error(
        `No assets found for type: ${assetType} with provided fields: ${JSON.stringify(
          fields,
        )}`,
      );
    }

    for (const asset of assets) {
      const perspectives = getAssetPerspectives(asset);
      results.push({
        asset: asset,
        perspectives: perspectives,
      });
    }

    return results;
  },
});

function getAssetPerspectives(asset: any): Record<string, string> {
  const perspectivesString = (asset.groups ?? '') as string;
  const perspectives = perspectivesString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const perspectivesAsObject = perspectives.reduce((acc, item) => {
    const [key, ...rest] = item.split(':');
    acc[key.trim()] = rest.join(':').trim();
    return acc;
  }, {} as Record<string, string>);

  return perspectivesAsObject;
}
