import { Property, Validators } from '@openops/blocks-framework';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';
import {
  DateOpenOpsField,
  DurationOpenOpsField,
  getFields,
  NumberOpenOpsField,
  OpenOpsField,
  RatingOpenOpsField,
  SelectOpenOpsField,
} from './fields';
import { getTableIdByTableName, getTableNames } from './tables';

export function openopsTablesDropdownProperty(): any {
  return Property.Dropdown({
    displayName: 'Table',
    refreshers: [],
    required: true,
    options: async () => {
      const tables = await getTableNames();

      return {
        disabled: false,
        options: tables.map((t) => {
          return {
            label: t,
            value: t,
          };
        }),
      };
    },
  });
}

export async function getTableFields(
  tableName: string,
): Promise<OpenOpsField[]> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();

  const tableId = await getTableIdByTableName(tableName as unknown as string);

  return await getFields(tableId, token);
}

// https://api.baserow.io/api/redoc/#tag/Database-table-fields/operation/get_database_table_field
// https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/update_database_table_row
export function getPropertyFromField(field: OpenOpsField, required = true) {
  field.description = field.description ?? '';

  switch (field.type) {
    case 'text': {
      return getShortTextProperty(field, required);
    }
    case 'long_text': {
      return Property.LongText({
        displayName: field.name,
        description: field.description,
        required: required,
      });
    }
    case 'email': {
      return Property.LongText({
        displayName: field.name,
        description: field.description,
        required: required,
        validators: [Validators.email],
      });
    }
    case 'number': {
      const numberField = field as NumberOpenOpsField;
      return getNumberProperty(
        numberField,
        numberField.number_negative ? [Validators.minValue(0)] : [],
        required,
      );
    }
    case 'rating': {
      const ratingField = field as RatingOpenOpsField;
      return getNumberProperty(
        ratingField,
        [Validators.minValue(0), Validators.maxValue(ratingField.max_value)],
        required,
      );
    }
    case 'boolean': {
      return Property.StaticDropdown({
        displayName: field.name,
        description: field.description,
        required: required,
        options: {
          options: [
            { label: 'True', value: true },
            { label: 'False', value: false },
          ],
        },
      });
    }
    case 'date': {
      return getDateProperty(field, required);
    }
    case 'last_modified': {
      return getDateProperty(field, required);
    }
    case 'last_modified_by': {
      return getShortTextProperty(field, required);
    }
    case 'created_on': {
      return getDateProperty(field, required);
    }
    case 'created_by': {
      return getShortTextProperty(field, required);
    }
    case 'duration': {
      const durationField = field as DurationOpenOpsField;
      durationField.description =
        field.description + ' (Format: ' + durationField.duration_format + ')';
      return getShortTextProperty(durationField, required);
    }
    case 'link_row': {
      return getLongTextProperty(field, required);
    }
    case 'file': {
      return getLongTextProperty(field, required);
    }
    case 'single_select': {
      const options = (field as SelectOpenOpsField).select_options;
      return Property.StaticDropdown({
        displayName: field.name,
        description: field.description,
        required: required,
        options: {
          options: options.map(
            (option: { id: number; value: any; color: string }) => {
              return { label: option.value, value: option.value };
            },
          ),
        },
      });
    }
    case 'multiple_select': {
      const options = (field as SelectOpenOpsField).select_options;
      return Property.StaticMultiSelectDropdown({
        displayName: field.name,
        description: field.description,
        required: required,
        options: {
          options: options.map(
            (option: { id: number; value: any; color: string }) => {
              return { label: option.value, value: option.value };
            },
          ),
        },
      });
    }
    case 'phone_number': {
      return getShortTextProperty(field, [Validators.maxLength(100)], required);
    }
    case 'multiple_collaborators ': {
      // TODO: Array Property
      return {};
    }
    case 'password ': {
      return Property.LongText({
        displayName: field.name,
        description: field.description,
        required: required,
      });
    }
    case 'ai': {
      return Property.LongText({
        displayName: field.name,
        description: field.description,
        required: required,
      });
    }
    default: {
      return getLongTextProperty(field, required);
    }
  }
}

function getShortTextProperty(
  field: OpenOpsField,
  validators?: any,
  required = true,
) {
  return Property.ShortText({
    displayName: field.name,
    description: field.description,
    required: required,
    validators: validators ?? [],
  });
}

function getLongTextProperty(
  field: OpenOpsField,
  validators?: any,
  required = true,
) {
  return Property.LongText({
    displayName: field.name,
    description: field.description,
    required: required,
    validators: validators ?? [],
  });
}

function getNumberProperty(
  field: OpenOpsField,
  validators?: any,
  required = true,
) {
  return Property.Number({
    displayName: field.name,
    description: field.description,
    required: required,
    validators: validators ?? [],
  });
}

function getDateProperty(field: OpenOpsField, required = true) {
  const dateField = field as DateOpenOpsField;

  return Property.DateTime({
    displayName: field.name,
    description:
      field.description +
      (dateField.date_include_time
        ? ' (Time needs to be included)'
        : '' + ' (Format: ISO YYYY-MM-DD) '),
    required: required,
  });
}
