import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { makePostRequest } from '../common/call-rest-api';
import { getAssetTypes } from '../common/get-asset-types';
import { safeFetch } from '../common/safe-fetch';

export const tagAssetAction = createAction({
  name: 'cloudhealth_tag_asset',
  displayName: 'Add or Update Asset Tags',
  description: 'Add or Update Asset Tags',
  auth: cloudhealthAuth,
  requireToolApproval: true,
  props: {
    assetType: Property.Dropdown({
      displayName: 'Asset Type',
      description: 'The type of asset to tag.',
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
    assetId: Property.Number({
      displayName: 'Asset ID',
      description: 'The ID of the asset to tag.',
      required: true,
    }),
    tags: Property.Object({
      displayName: 'Tags to Add or Update',
      description: 'Name and value of the tag to be added or updated',
      required: true,
    }),
  },
  async run(context) {
    const { assetType, assetId, tags } = context.propsValue;

    try {
      return await makePostRequest(context.auth, `/v1/custom_tags`, {
        tag_groups: [
          {
            asset_type: assetType,
            ids: [assetId],
            tags: Object.entries(tags).map(([key, value]) => {
              return { key: key, value: value };
            }),
          },
        ],
      });
    } catch (error) {
      throw new Error(
        `Failed to save tags for asset ${assetType} with ID ${assetId}: ${error}`,
      );
    }
  },
});
