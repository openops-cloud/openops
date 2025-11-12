import { createAction, Property } from '@openops/blocks-framework';
import { cloudabilityAuth } from '../auth';
import {
  getRecommendationTypesProperty,
  getVendorsProperty,
} from '../common/common-properties';
import { unsnoozeRecommendations, Vendor } from '../common/recommendations-api';

export const unsnoozeRecommendationAction = createAction({
  name: `cloudability_unsnooze_recommendations`,
  displayName: `Unsnooze Recommendations`,
  description: `Re-enable previously snoozed recommendations`,
  auth: cloudabilityAuth,
  isWriteAction: true,
  props: {
    ...getVendorsProperty(),
    ...getRecommendationTypesProperty(),
    accountId: Property.ShortText({
      displayName: 'Account ID',
      description: 'The ID of the account to which the recommendation belongs',
      required: true,
    }),
    resourceIds: Property.Array({
      displayName: 'Resource IDs',
      description: 'The IDs of the resources to unsnooze recommendations for',
      required: true,
    }),
  },
  async run(context) {
    const { vendor, recommendationType, accountId, resourceIds } =
      context.propsValue;
    const { auth } = context;

    const result = await unsnoozeRecommendations({
      auth,
      vendor: vendor as Vendor,
      recommendationType: recommendationType,
      accountId,
      resourceIds: resourceIds as string[],
    });

    return result;
  },
});
