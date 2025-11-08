import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { HGAuth, hyperglanceAuth } from './lib/auth';
import {  getRecommendations} from './lib/actions/getRecommendations';
import { exportTopologyForGroup } from './lib/actions/exportTopologyForGroup';
import { searchTopology } from './lib/actions/searchTopology';
import { getCollectorRecords } from './lib/actions/getCollectorRecords';
import { getCollectorRecordStatus } from './lib/actions/getCollectorRecordStatus';
import { getCollectorRecordStatistics } from './lib/actions/getCollectorRecordStatistics';

export const hyperglance = createBlock({
  displayName: 'Hyperglance',
  auth: hyperglanceAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/hyperglance.svg',
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
      name:'customHgApiCall'
    }),
  ],
  triggers: [],
});
