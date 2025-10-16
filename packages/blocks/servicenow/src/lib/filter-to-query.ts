import { ViewFilterTypesEnum } from '@openops/common';

/**
 * Maps ViewFilterTypesEnum to ServiceNow query operators
 */
export function mapFilterTypeToServiceNowOperator(
  filterType: ViewFilterTypesEnum,
): string {
  const mapping: Record<ViewFilterTypesEnum, string> = {
    [ViewFilterTypesEnum.equal]: '=',
    [ViewFilterTypesEnum.not_equal]: '!=',
    [ViewFilterTypesEnum.contains]: 'LIKE',
    [ViewFilterTypesEnum.contains_not]: 'NOTLIKE',
    [ViewFilterTypesEnum.empty]: 'ISEMPTY',
    [ViewFilterTypesEnum.not_empty]: 'ISNOTEMPTY',
    [ViewFilterTypesEnum.higher_than]: '>',
    [ViewFilterTypesEnum.higher_than_or_equal]: '>=',
    [ViewFilterTypesEnum.lower_than]: '<',
    [ViewFilterTypesEnum.lower_than_or_equal]: '<=',
    [ViewFilterTypesEnum.date_after]: '>',
    [ViewFilterTypesEnum.date_after_or_equal]: '>=',
    [ViewFilterTypesEnum.date_before]: '<',
    [ViewFilterTypesEnum.date_before_or_equal]: '<=',
    [ViewFilterTypesEnum.date_equal]: '=',
    [ViewFilterTypesEnum.date_is_on_or_after]: '>=',
    [ViewFilterTypesEnum.date_is_on_or_before]: '<=',
    [ViewFilterTypesEnum.date_is_within]: 'DATEPART',
    [ViewFilterTypesEnum.boolean]: '=',
    [ViewFilterTypesEnum.single_select_equal]: '=',
    [ViewFilterTypesEnum.single_select_not_equal]: '!=',
    [ViewFilterTypesEnum.single_select_is_any_of]: 'IN',
    [ViewFilterTypesEnum.single_select_is_none_of]: 'NOT IN',
  };

  return mapping[filterType] || '=';
}

/**
 * Builds a ServiceNow encoded query string from structured filters
 */
export function buildServiceNowQuery(
  filters: Array<{
    fieldName: string;
    filterType: ViewFilterTypesEnum;
    value: unknown;
  }>,
  filterType: 'AND' | 'OR',
): string {
  if (!filters || filters.length === 0) {
    return '';
  }

  const queryParts = filters.map((filter) => {
    const operator = mapFilterTypeToServiceNowOperator(filter.filterType);
    const fieldName = filter.fieldName;
    const value = filter.value;

    if (
      filter.filterType === ViewFilterTypesEnum.empty ||
      filter.filterType === ViewFilterTypesEnum.not_empty
    ) {
      return `${fieldName}${operator}`;
    }

    if (
      filter.filterType === ViewFilterTypesEnum.single_select_is_any_of ||
      filter.filterType === ViewFilterTypesEnum.single_select_is_none_of
    ) {
      const values = Array.isArray(value) ? value.join(',') : value;
      return `${fieldName}${operator}${values}`;
    }

    if (filter.filterType === ViewFilterTypesEnum.boolean) {
      const boolValue = value === true || value === 'true' ? 'true' : 'false';
      return `${fieldName}=${boolValue}`;
    }

    return `${fieldName}${operator}${value}`;
  });

  const separator = filterType === 'OR' ? '^OR' : '^';
  return queryParts.join(separator);
}
