import { Property } from '@openops/blocks-framework';
import { ServiceNowAuth } from './auth';
import { getServiceNowChoiceValues } from './get-choice-values';
import { ServiceNowTableField } from './get-table-fields';

/**
 * Creates the appropriate Property type for a ServiceNow field value,
 * including handling choice fields with dynamic options.
 *
 * @param field The ServiceNow field metadata
 * @param auth ServiceNow authentication object
 * @param tableName The table name containing the field
 * @param required Whether the property should be required
 * @returns A Property configuration object
 */
export async function createFieldValueProperty(
  field: ServiceNowTableField,
  auth: ServiceNowAuth,
  tableName: string,
  required = false,
): Promise<any> {
  const internalType = field.internal_type?.value;
  const displayName = field.column_label || field.element;

  if (field.choice === 'true' || internalType === 'choice') {
    const choices = await getServiceNowChoiceValues(
      auth,
      tableName,
      field.element,
    );

    if (choices.length > 0) {
      return Property.StaticDropdown({
        displayName,
        required,
        options: {
          options: choices.map((choice) => ({
            label: choice.label,
            value: choice.value,
          })),
        },
      });
    } else {
      return Property.ShortText({
        displayName,
        description: 'Enter the choice value',
        required,
      });
    }
  }

  if (internalType === 'boolean') {
    return Property.Checkbox({
      displayName,
      required,
    });
  }

  if (
    internalType === 'glide_date' ||
    internalType === 'glide_date_time' ||
    internalType === 'due_date' ||
    internalType === 'glide_time'
  ) {
    const isDateTime =
      internalType === 'glide_date_time' ||
      internalType === 'due_date' ||
      internalType === 'glide_time';
    return Property.DateTime({
      displayName,
      description: isDateTime
        ? '(Format: ISO YYYY-MM-DD HH:mm:ss)'
        : '(Format: ISO YYYY-MM-DD)',
      required,
    });
  }

  if (
    internalType === 'integer' ||
    internalType === 'decimal' ||
    internalType === 'float' ||
    internalType === 'currency' ||
    internalType === 'percent_complete'
  ) {
    return Property.Number({
      displayName,
      required,
    });
  }

  if (
    internalType === 'string' &&
    field.max_length &&
    parseInt(field.max_length) > 255
  ) {
    return Property.LongText({
      displayName,
      required,
    });
  }

  if (field.reference) {
    return Property.ShortText({
      displayName,
      description: `Reference to ${JSON.stringify(
        field.reference,
      )} table (sys_id)`,
      required,
    });
  }

  return Property.ShortText({
    displayName,
    required,
  });
}
