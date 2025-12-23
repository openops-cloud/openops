import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getIncidentAction } from './lib/actions/get-incidents-action';
import { getActiveRecommendationsAction } from './lib/actions/get-recommendations-action';
import { flexeraAuth } from './lib/auth';
import { generateAccessToken } from './lib/common/make-request';

export const flexera = createBlock({
  displayName: 'Flexera',
  auth: flexeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/flexera.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getActiveRecommendationsAction,
    getIncidentAction,
    // getIncidentActionsAction,
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: flexeraAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Flexera API documentation](https://docs.flexera.com/flexera/EN/FlexeraAPI/GetStartedAPI.htm).',
        }),
      },
      authMapping: async ({ auth }: any) => {
        const accessToken = await generateAccessToken({
          refreshToken: auth.refreshToken,
          appRegion: auth.appRegion,
        });

        return {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
  triggers: [],
});
