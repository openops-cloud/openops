import { createAction, Property } from '@openops/blocks-framework';
import { cloudabilityAuth } from '../auth';
import {
  getRecommendationTypesProperty,
  getVendorsProperty,
} from '../common/common-properties';
import { snoozeRecommendations, Vendor } from '../common/recommendations-api';

export const snoozeRecommendationAction = createAction({
  name: `cloudability_snooze_recommendations`,
  displayName: `Snooze Recommendations`,
  description: `Temporarily suppress recommendations from appearing`,
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
      description: 'The IDs of the resources to snooze recommendations for',
      required: true,
    }),
    snoozeUntil: Property.ShortText({
      displayName: 'Snooze Until',
      description:
        'The date and time until the recommendation should be snoozed. Format: yyyy-MM-dd. Use "never" to snooze indefinitely.',
      required: true,
    }),
  },
  async run(context) {
    const { vendor, recommendationType, accountId, resourceIds, snoozeUntil } =
      context.propsValue;
    const { auth } = context;

    const result = await snoozeRecommendations({
      auth,
      vendor: vendor as Vendor,
      recommendationType: recommendationType,
      accountId,
      resourceIds: resourceIds as string[],
      snoozeUntil,
    });

    return result;
  },
});
