import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { runGetRecordAction } from './action-runners';

export const getRecordAction = createAction({
  auth: servicenowAuth,
  name: 'get_record',
  description: 'Get a single record from a ServiceNow table by its sys_id.',
  displayName: 'Get Record',
  isWriteAction: false,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description: 'The sys_id of the record to retrieve.',
      required: true,
    }),
    fields: servicenowFieldsDropdownProperty(),
  },
  async run(context) {
    const { tableName, sysId, fields } = context.propsValue;

    const selectedFields = (fields as { fields?: string[] })?.fields;

    return runGetRecordAction({
      auth: context.auth as ServiceNowAuth,
      tableName: tableName as string,
      sysId: sysId as string,
      fields: selectedFields,
    });
  },
});
