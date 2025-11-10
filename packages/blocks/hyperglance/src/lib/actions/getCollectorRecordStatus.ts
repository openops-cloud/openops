import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import { getDatasourceProp } from '../hgapi/common';
import { getAliasDropdownProp, getRecordStatus } from '../hgapi/collectorRecords';

export const getCollectorRecordStatus = createAction({
  auth: hyperglanceAuth,
  name: 'getCollectorRecordStatus',
  displayName: 'Get Credential Status',
  description: 'Returns Collector Record Status',
  props: {
    datasource: getDatasourceProp({description:'Get credential of this cloud provider'}),
    alias: getAliasDropdownProp()
  },
  isWriteAction: false,
  async run(context) {
    const {datasource="", alias} = context.propsValue;
    return await getRecordStatus(context.auth, datasource, alias);
  },
});