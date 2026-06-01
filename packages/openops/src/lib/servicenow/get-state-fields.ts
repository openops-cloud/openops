import { logger } from '@openops/server-shared';
import { ServiceNowAuth } from './auth';
import { getServiceNowTableFields } from './get-table-fields';

export interface ServiceNowStateField {
  element: string;
  column_label: string;
  internal_type: string;
}

/**
 * Returns the columns on the given table (including parent-table columns)
 * that are usable as a status field — i.e. those whose values come from a
 * fixed choice list, so we can show them in a dropdown and reliably map
 * polled values back to OpenOps statuses.
 *
 * Picks columns whose `internal_type` is `choice`, or whose sys_dictionary
 * `choice` flag is `'1'` (dropdown) or `'3'` (dropdown without --None--).
 * `'2'` (suggestion) is excluded because it allows free-text values.
 */
export async function getServiceNowStateFields(
  auth: ServiceNowAuth,
  tableName: string,
): Promise<ServiceNowStateField[]> {
  try {
    const fields = await getServiceNowTableFields(auth, tableName);

    return fields
      .filter((f) => {
        if (!f.element?.trim()) {
          return false;
        }
        const internalType =
          typeof f.internal_type === 'string'
            ? f.internal_type
            : f.internal_type?.value ?? '';
        return (
          internalType === 'choice' || f.choice === '1' || f.choice === '3'
        );
      })
      .map((f) => ({
        element: f.element,
        column_label: f.column_label || f.element,
        internal_type:
          typeof f.internal_type === 'string'
            ? f.internal_type
            : f.internal_type?.value ?? '',
      }));
  } catch (error) {
    logger.warn('Error fetching ServiceNow state fields', { error });
    return [];
  }
}
