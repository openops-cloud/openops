import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createChangeRequestsAction } from './lib/actions/create-change-requests-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';
import { getRecommendationsSummaryAction } from './lib/actions/get-recommendations-summary-action';
import { getReportAction } from './lib/actions/get-report-action';
import { postponeRecommendationsAction } from './lib/actions/postpone-recommendations-action';
import { cloudfixAuth } from './lib/common/auth';

export const cloudfix = createBlock({
  displayName: 'CloudFix',
  auth: cloudfixAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudfix.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getRecommendationsAction,
    createChangeRequestsAction,
    postponeRecommendationsAction,
    getRecommendationsSummaryAction,
    getReportAction,
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: cloudfixAuth,
      authMapping: async (context) => ({
        Bearer: (context.auth as any).apiToken,
      }),
    }),
  ],
  triggers: [],
});
