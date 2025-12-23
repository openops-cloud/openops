import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { exportTopologyForGroup } from './lib/actions/exportTopologyForGroup';
import { getCollectorRecords } from './lib/actions/getCollectorRecords';
import { getCollectorRecordStatistics } from './lib/actions/getCollectorRecordStatistics';
import { getCollectorRecordStatus } from './lib/actions/getCollectorRecordStatus';
import { getRecommendations } from './lib/actions/getRecommendations';
import { searchTopology } from './lib/actions/searchTopology';
import { HGAuth, hyperglanceAuth } from './lib/auth';

export const hyperglance = createBlock({
  displayName: 'Hyperglance',
  auth: hyperglanceAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/hyperglance.svg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    exportTopologyForGroup,
    getCollectorRecordStatistics,
    getCollectorRecordStatus,
    getRecommendations,
    searchTopology,
    getCollectorRecords,
    createCustomApiCallAction({
      baseUrl: (auth) => {
        return `${(auth as HGAuth).instanceUrl}/hgapi/`;
      },
      auth: hyperglanceAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Hyperglance API documentation](https://support.hyperglance.com/knowledge/getting-started-with-the-hyperglance-api).',
        }),
      },
      name: 'customHgApiCall',
    }),
  ],
  triggers: [],
});
