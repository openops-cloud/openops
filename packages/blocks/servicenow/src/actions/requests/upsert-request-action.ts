import { createAction, Property } from '@openops/blocks-framework';
import { servicenowAuth, ServiceNowAuth } from '../../lib/auth';
import { buildFieldsBody, runUpsertRecordAction } from '../action-runners';
import { createFieldsPropertiesForCreate } from '../create-fields-properties';
import { TABLE_NAME } from './constants';

export const upsertRequestAction = createAction({
  auth: servicenowAuth,
  name: 'upsert_request',
  description:
    'Create a new request item or update an existing request item in ServiceNow.',
  displayName: 'Add or Update Request',
  isWriteAction: true,
  props: {
    sysId: Property.ShortText({
      displayName: 'System ID',
      description:
        'The sys_id of the request to update. If left empty or if the request does not exist, a new request will be created.',
      required: false,
    }),
    fieldsProperties: Property.DynamicProperties({
      displayName: '',
      description: '',
      required: true,
      refreshers: ['auth'],
      props: async ({ auth }) => {
        if (!auth) {
          return {};
        }
        return createFieldsPropertiesForCreate(
          auth as ServiceNowAuth,
          TABLE_NAME,
        );
      },
    }),
  },
  async run(context) {
    const { sysId, fieldsProperties } = context.propsValue;

    const body = buildFieldsBody(fieldsProperties);

    return runUpsertRecordAction({
      auth: context.auth as ServiceNowAuth,
      tableName: TABLE_NAME,
      sysId: sysId as string | undefined,
      body,
    });
  },
});
