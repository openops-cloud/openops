import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { runDeleteRecordAction } from './action-runners';

export const deleteRecordAction = createAction({
  auth: servicenowAuth,
  name: 'delete_record',
  description: 'Delete a record from a ServiceNow table.',
  displayName: 'Delete Record',
  isWriteAction: true,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description: 'The sys_id of the record to delete.',
      required: true,
    }),
  },
  async run(context) {
    return runDeleteRecordAction({
      auth: context.auth as ServiceNowAuth,
      tableName: context.propsValue.tableName as string,
      sysId: context.propsValue.sysId as string,
      recordType: 'record',
    });
  },
});
