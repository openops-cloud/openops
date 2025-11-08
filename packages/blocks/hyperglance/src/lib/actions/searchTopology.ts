import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import { getAccountProp, getTagKeyProp, getTagValueProp, search, SearchPropsType } from '../hgapi/search';
import { getDatasourceProp, getResourceTypeProp } from '../hgapi/common';

export const searchTopology = createAction({
  auth: hyperglanceAuth,
  name: 'searchTopology',
  displayName: 'Get Resource List',
  description: 'Returns a list of all entities which match the applied filter criteria',
  props: {
    datasource: getDatasourceProp({ required : false, description:'Get resources in regards to this cloud provider'}),
    type: getResourceTypeProp({required: true, description:'Get resources in regards to this type of resource'}),
    account:getAccountProp(),
    tagKey: getTagKeyProp(),
    tagValue: getTagValueProp()
  },
  isWriteAction: false,
  async run(context) {
    return await search(context.auth, context.propsValue as SearchPropsType);
  },
});