export enum ViewFilterTypesEnum {
  boolean = 'Boolean',
  contains = 'Contains',
  contains_not = 'Does not contain',
  date_after = 'Date after',
  date_after_or_equal = 'Date is after or equal',
  date_before = 'Date before',
  date_before_or_equal = 'Date is before or equal',
  date_equal = 'Date is equal',
  date_is_on_or_after = 'Date is on or after',
  date_is_on_or_before = 'Date is on or before',
  date_is_within = 'Date is within',
  empty = 'Is empty',
  equal = 'Is equal',
  higher_than = 'Is higher than',
  higher_than_or_equal = 'Is higher than or equal',
  lower_than = 'Is lower than',
  lower_than_or_equal = 'Is lower than or equal',
  not_empty = 'Is not empty',
  not_equal = 'Is not equal',
  single_select_equal = 'Single select is equal',
  single_select_is_any_of = 'Single select is any of',
  single_select_is_none_of = 'Single select is none of',
  single_select_not_equal = 'Single select is not equal',
}

export function isSingleValueFilter(filterType: ViewFilterTypesEnum): boolean {
  return (
    [ViewFilterTypesEnum.empty, ViewFilterTypesEnum.not_empty].find(
      (x) => x == filterType,
    ) !== undefined
  );
}

export enum FilterType {
  AND = 'AND',
  OR = 'OR',
}

interface OpenOpsSimpleFilter {
  field: number | string;
  value: any;
  type: string;
}

interface OpenOpsFilterGroup {
  filter_type: FilterType;
  filters: Array<OpenOpsSimpleFilter | OpenOpsFilterGroup>;
}

export function buildSimpleFilterUrlParam(
  field: string | number,
  type: ViewFilterTypesEnum,
) {
  const key = getEnumKeyByValue(ViewFilterTypesEnum, type);
  return `filter__${field}__${key}`;
}

export function createSimpleFilter(
  filterData: OpenOpsSimpleFilter,
): OpenOpsSimpleFilter {
  const key = getEnumKeyByValue(ViewFilterTypesEnum, filterData.type);
  return { field: filterData.field, value: filterData.value, type: key };
}

export function createFilterGroup(
  filter_type: FilterType,
  filters: Array<OpenOpsSimpleFilter | OpenOpsFilterGroup>,
): OpenOpsFilterGroup {
  return { filter_type, filters };
}

function getEnumKeyByValue<T extends { [index: string]: string }>(
  enumObj: T,
  value: string,
): string {
  const key = Object.keys(enumObj).find(
    (key) => enumObj[key as keyof T] === value,
  );
  if (!key) {
    throw new Error(`Value ${value} not found in enum ${enumObj}`);
  }
  return key;
}
