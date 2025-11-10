import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import {
  getAliasDropdownProp,
  getRecordStatistics,
} from '../hgapi/collectorRecords';
import { getDatasourceProp } from '../hgapi/common';

export const getCollectorRecordStatistics = createAction({
  auth: hyperglanceAuth,
  name: 'getCollectorRecordStatistics',
  displayName: 'Get Credential Statistics',
  description: 'Returns Collection Statistics for the credential',
  props: {
    datasource: getDatasourceProp({
      description: 'Get credential of this cloud provider',
    }),
    alias: getAliasDropdownProp(),
  },
  isWriteAction: false,
  async run(context) {
    const { datasource = '', alias } = context.propsValue;
    return await getRecordStatistics(context.auth, datasource, alias);
  },
});
