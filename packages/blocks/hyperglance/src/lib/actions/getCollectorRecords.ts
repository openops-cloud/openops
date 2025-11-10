import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import { getDatasourceProp } from '../hgapi/common';
import { listRecords } from '../hgapi/collectorRecords';

export const getCollectorRecords = createAction({
  auth: hyperglanceAuth,
  name: 'getCollectorRecords',
  displayName: 'List Credentials',
  description: 'List All Hyperglance Credentials',
  props: {
    datasource: getDatasourceProp({description:'List credentials of this cloud provider'})
  },
  isWriteAction: false,
  async run(context) {
    return await listRecords(context.auth, context.propsValue.datasource??"");
  },
});