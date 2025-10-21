import { DropdownProperty, Property } from '@openops/blocks-framework';
import { ServiceNowAuth } from './auth';
import { getServiceNowTables } from './get-tables';

export function servicenowTableDropdownProperty(): DropdownProperty<
  string,
  true
> {
  return Property.Dropdown({
    displayName: 'Table',
    description: 'Select a ServiceNow table',
    refreshers: ['auth'],
    required: true,
    options: async ({ auth }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please authenticate first',
        };
      }

      try {
        const tables = await getServiceNowTables(auth as ServiceNowAuth);

        if (tables.length === 0) {
          return {
            disabled: true,
            options: [],
            placeholder: 'No tables found',
          };
        }

        return {
          disabled: false,
          options: tables.map((t) => {
            return {
              label: `${t.label} (${t.name})`,
              value: t.name,
            };
          }),
        };
      } catch (error) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Failed to fetch tables',
          error: (error as Error).message,
        };
      }
    },
  });
}
