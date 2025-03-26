import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  authenticateDefaultUserInOpenOpsTables,
  FilterType,
  getPropertyFromField,
  getRows,
  getTableFields,
  getTableIdByTableName,
  isSingleValueFilter,
  openopsTablesDropdownProperty,
  ViewFilterTypesEnum,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';

export const getRecordsAction = createAction({
  auth: BlockAuth.None(),
  name: 'get_records',
  description: 'Get all records matching the provided filters.',
  displayName: 'Get Records',
  props: {
    tableName: openopsTablesDropdownProperty(),
    filterType: Property.StaticDropdown({
      displayName: 'Filter type',
      required: false,
      options: {
        options: Object.entries(FilterType).map(([key, value]) => ({
          label: value,
          value: key,
        })),
      },
    }),
    filters: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['tableName'],
      props: async ({ tableName }) => {
        if (!tableName) {
          return {};
        }
        const properties: { [key: string]: any } = {};

        const tableFields = await getTableFields(
          tableName as unknown as string,
        );

        properties['filters'] = Property.Array({
          displayName: 'Fields to filter by',
          required: false,
          properties: {
            fieldName: Property.StaticDropdown<string>({
              displayName: 'Field name',
              required: true,
              options: {
                options: tableFields.map((f) => ({
                  label: f.name,
                  value: f.name,
                })),
              },
            }),
            filterType: Property.StaticDropdown<ViewFilterTypesEnum>({
              displayName: 'Filter type',
              required: true,
              options: {
                options: Object.keys(ViewFilterTypesEnum).map((key) => ({
                  label:
                    ViewFilterTypesEnum[
                      key as keyof typeof ViewFilterTypesEnum
                    ],
                  value:
                    ViewFilterTypesEnum[
                      key as keyof typeof ViewFilterTypesEnum
                    ],
                })),
              },
            }),
            value: Property.DynamicProperties({
              displayName: 'Value to search for',
              required: true,
              refreshers: ['fieldName', 'filterType'],
              props: async ({ fieldName, filterType }) => {
                const shouldDisplayValueProperty =
                  fieldName &&
                  !isSingleValueFilter(
                    filterType as unknown as ViewFilterTypesEnum,
                  );
                const currentField = fieldName as unknown as string;
                const openOpsField = tableFields.find(
                  (f) => f.name === currentField,
                );

                const innerProps: { [key: string]: any } = {
                  value:
                    shouldDisplayValueProperty && openOpsField
                      ? getPropertyFromField(openOpsField, true)
                      : {},
                };

                return innerProps;
              },
            }),
          },
        });
        return properties;
      },
    }),
  },
  async run(context) {
    const { token } = await authenticateDefaultUserInOpenOpsTables();

    const tableName = context.propsValue.tableName as unknown as string;

    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName],
    );

    const filtersProps = context.propsValue.filters['filters'] as unknown as {
      fieldName: string;
      value: any;
      filterType: any;
    }[];

    const filters = filtersProps?.map((filter) => {
      const fieldFilterType = getFieldFilterTypeForEmptyValue(
        filter.filterType,
        filter.value['value'],
      );
      return {
        fieldName: filter.fieldName,
        value: filter.value['value'],
        type: fieldFilterType,
      };
    });
    const filterType = context.propsValue.filterType as FilterType;

    const rows = await getRows({
      tableId: tableId,
      token: token,
      filters,
      filterType: filterType,
    });

    return { count: rows.length, items: rows };
  },
});

function getFieldFilterTypeForEmptyValue(
  originalFieldFilterType: ViewFilterTypesEnum,
  fieldValue: any,
) {
  const valueIsEmpty =
    fieldValue === '' || fieldValue === null || fieldValue === undefined;

  if (!valueIsEmpty) {
    return originalFieldFilterType;
  }

  if (originalFieldFilterType === ViewFilterTypesEnum.equal) {
    return ViewFilterTypesEnum.empty;
  }

  if (originalFieldFilterType === ViewFilterTypesEnum.not_equal) {
    return ViewFilterTypesEnum.not_empty;
  }

  return originalFieldFilterType;
}
