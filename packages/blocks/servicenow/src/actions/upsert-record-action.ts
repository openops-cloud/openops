import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { buildFieldsBody, runUpsertRecordAction } from './action-runners';
import { createFieldsPropertiesForCreate } from './create-fields-properties';

export const upsertRecordAction = createAction({
  auth: servicenowAuth,
  name: 'upsert_record',
  description: 'Create a new record or update an existing record in a ServiceNow table',
  displayName: 'Add or Update Record',
  isWriteAction: true,
  props: {
    tableName: servicenowTableDropdownProperty(),
    sysId: Property.ShortText({
      displayName: 'System ID',
      description:
        'The sys_id of the record to update. If left empty or if the record does not exist, a new record will be created.',
      required: false,
    }),
    fieldsProperties: Property.DynamicProperties({
      displayName: 'Fields Properties',
      description: 'Fields to set for the ServiceNow record',
      required: true,
      refreshers: ['auth', 'tableName'],
      props: async ({ auth, tableName }) => {
        if (!auth || !tableName) {
          return {};
        }
        return createFieldsPropertiesForCreate(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );
      },
    }),
  },
  async run(context) {
    const { tableName, sysId, fieldsProperties } = context.propsValue;

    const body = buildFieldsBody(fieldsProperties);

    return runUpsertRecordAction({
      auth: context.auth as ServiceNowAuth,
      tableName: tableName as string,
      sysId: sysId as string | undefined,
      body,
    });
  },
});
