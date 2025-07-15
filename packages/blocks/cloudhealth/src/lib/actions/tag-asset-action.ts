import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { makePostRequest } from '../common/call-rest-api';
import { getAssetTypes } from '../common/get-asset-types';

export const tagAssetAction = createAction({
  name: 'cloudhealth_tag_asset',
  displayName: 'Tag Asset',
  description: 'Tag an asset',
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
    assetId: Property.ShortText({
      displayName: 'Asset ID',
      description: 'The ID of the asset to tag.',
      required: true,
    }),
    tags: Property.Object({
      displayName: 'Tags',
      description: 'Name and value of the tag to be added',
      required: true,
    }),
  },
  async run(context) {
    const { assetType, assetId, tags } = context.propsValue;

    try {
      const result = await makePostRequest(context.auth, `/custom_tags`, {
        tag_groups: [
          {
            asset_type: assetType,
            asset_id: assetId,
            tags,
          },
        ],
      });

      return result;
    } catch (error) {
      throw new Error(
        `Failed to tag asset ${assetType} with ID ${assetId}: ${error}`,
      );
    }
  },
});
