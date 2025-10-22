import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../../lib/auth';
import { runDeleteRecordAction } from '../action-runners';
import { TABLE_NAME } from './constants';

export const deleteRequestAction = createAction({
  auth: servicenowAuth,
  name: 'delete_request',
  description: 'Delete a request item from ServiceNow.',
  displayName: 'Delete Request',
  isWriteAction: true,
  props: {
    sysId: Property.ShortText({
      displayName: 'System ID',
      description: 'The sys_id of the request to delete.',
      required: true,
    }),
  },
  async run(context) {
    return runDeleteRecordAction({
      auth: context.auth as ServiceNowAuth,
      tableName: TABLE_NAME,
      sysId: context.propsValue.sysId as string,
      recordType: 'request',
    });
  },
});
