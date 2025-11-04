import { DynamicPropsValue, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ServiceNowAuth } from './auth';
import { getServiceNowTableFields } from './get-table-fields';

export function servicenowFieldsDropdownProperty() {
  return Property.DynamicProperties({
    displayName: 'Model',
    required: true,
    refreshers: ['auth', 'tableName'],
    props: async ({ auth, tableName }) => {
      const props: DynamicPropsValue = {};

      if (!auth || !tableName) {
        return props;
      }

      try {
        const fields = await getServiceNowTableFields(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );

        if (fields.length === 0) {
          return props;
        }

        const fieldOptions = fields.map((field) => ({
          label: field.column_label
            ? `${field.column_label} (${field.element})`
            : field.element,
          value: field.element,
        }));

        const defaultValues = fields.map((field) => field.element);

        props['selected'] = Property.StaticMultiSelectDropdown<string>({
          displayName: 'Fields',
          description: 'Select the fields to return.',
          required: true,
          options: {
            disabled: false,
            options: fieldOptions,
          },
          defaultValue: defaultValues,
        });
      } catch (error) {
        logger.warn(
          'Fetching ServiceNow table fields is not possible, omit field selector. Error:',
          { error },
        );
      }

      return props;
    },
  });
}
