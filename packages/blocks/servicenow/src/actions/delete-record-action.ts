import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';

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
    const auth = context.auth as ServiceNowAuth;
    const { tableName, sysId } = context.propsValue;

    await httpClient.sendRequest({
      method: HttpMethod.DELETE,
      url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
      headers: {
        ...generateAuthHeader({
          username: auth.username,
          password: auth.password,
        }),
        Accept: 'application/json',
      },
    });

    return {
      success: true,
      message: `The record with id "${sysId}" was deleted`,
    };
  },
});
