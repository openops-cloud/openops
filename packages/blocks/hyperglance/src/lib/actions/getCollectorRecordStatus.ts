import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import {
  getAliasDropdownProp,
  getRecordStatus,
} from '../hgapi/collectorRecords';
import { getDatasourceProp } from '../hgapi/common';

export const getCollectorRecordStatus = createAction({
  auth: hyperglanceAuth,
  name: 'getCollectorRecordStatus',
  displayName: 'Get Credential Status',
  description: 'Get collector record status for a cloud provider credential',
  props: {
    datasource: getDatasourceProp({
      description: 'Get credential of this cloud provider',
    }),
    alias: getAliasDropdownProp(),
  },
  isWriteAction: false,
  async run(context) {
    const { datasource = '', alias } = context.propsValue;
    return await getRecordStatus(context.auth, datasource, alias);
  },
});
