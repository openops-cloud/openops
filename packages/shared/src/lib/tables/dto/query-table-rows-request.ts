import { Static, Type } from '@sinclair/typebox';

/**
 * Row filter operators. The values are Baserow's own filter names, which is what the
 * Tables API expects on the wire, so no translation table is needed on either side.
 */
export enum TableRowFilterOperator {
  EQUAL = 'equal',
  NOT_EQUAL = 'not_equal',
  CONTAINS = 'contains',
  CONTAINS_NOT = 'contains_not',
  EMPTY = 'empty',
  NOT_EMPTY = 'not_empty',
  BOOLEAN = 'boolean',
  HIGHER_THAN = 'higher_than',
  HIGHER_THAN_OR_EQUAL = 'higher_than_or_equal',
  LOWER_THAN = 'lower_than',
  LOWER_THAN_OR_EQUAL = 'lower_than_or_equal',
  DATE_EQUAL = 'date_equal',
  DATE_BEFORE = 'date_before',
  DATE_BEFORE_OR_EQUAL = 'date_before_or_equal',
  DATE_AFTER = 'date_after',
  DATE_AFTER_OR_EQUAL = 'date_after_or_equal',
  DATE_IS_ON_OR_BEFORE = 'date_is_on_or_before',
  DATE_IS_ON_OR_AFTER = 'date_is_on_or_after',
  DATE_IS_WITHIN = 'date_is_within',
  SINGLE_SELECT_EQUAL = 'single_select_equal',
  SINGLE_SELECT_NOT_EQUAL = 'single_select_not_equal',
  SINGLE_SELECT_IS_ANY_OF = 'single_select_is_any_of',
  SINGLE_SELECT_IS_NONE_OF = 'single_select_is_none_of',
}

export enum TableRowFilterCombinator {
  AND = 'AND',
  OR = 'OR',
}

export const TableRowFilter = Type.Object({
  fieldName: Type.String({
    description:
      'Column name exactly as returned by the table columns endpoint.',
  }),
  operator: Type.Enum(TableRowFilterOperator),
  value: Type.Optional(
    Type.Union(
      [
        Type.String(),
        Type.Number(),
        Type.Boolean(),
        Type.Array(Type.Union([Type.String(), Type.Number()])),
      ],
      {
        description:
          'Comparison value: a string, number or boolean, or a list of strings or numbers ' +
          'for the *_is_any_of / *_is_none_of operators. Omit for operators that take ' +
          'none, such as empty and not_empty.',
      },
    ),
  ),
});

export type TableRowFilter = Static<typeof TableRowFilter>;

export enum TableRowSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const TableRowSort = Type.Object({
  fieldName: Type.String({
    description:
      'Column name exactly as returned by the table columns endpoint.',
  }),
  direction: Type.Optional(
    Type.Enum(TableRowSortDirection, {
      default: TableRowSortDirection.ASC,
      description: 'Defaults to asc.',
    }),
  ),
});

export type TableRowSort = Static<typeof TableRowSort>;

export const QueryTableRowsRequestBody = Type.Object({
  filters: Type.Optional(Type.Array(TableRowFilter)),
  orderBy: Type.Optional(
    Type.Array(TableRowSort, {
      description:
        "Sort order, applied in sequence. Omit for Baserow's default order (by row id).",
    }),
  ),
  columns: Type.Optional(
    Type.Array(Type.String(), {
      minItems: 1,
      description:
        'Return only these columns (plus the row id). Omit to return every column.',
    }),
  ),
  filterCombinator: Type.Optional(
    Type.Enum(TableRowFilterCombinator, {
      description:
        'How multiple filters combine. Required when more than one filter is given.',
    }),
  ),
  search: Type.Optional(
    Type.String({
      description: 'Free-text search across all columns of the table.',
    }),
  ),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  size: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 100 })),
});

export type QueryTableRowsRequestBody = Static<
  typeof QueryTableRowsRequestBody
>;

/**
 * Page-number pagination rather than the repo's cursor-based SeekPage: Baserow's rows API
 * only offers page numbers, and the total count is the field an agent needs most.
 * Encoding a page number as an opaque cursor would hide both.
 */
export const TableRowsPage = Type.Object({
  count: Type.Number({
    description: 'Total number of rows matching the query, across all pages.',
  }),
  page: Type.Integer({ description: 'The page returned (1-based).' }),
  size: Type.Integer({ description: 'The page size applied.' }),
  hasMore: Type.Boolean({
    description: 'Whether a later page exists. Request page + 1 to continue.',
  }),
  data: Type.Array(Type.Record(Type.String(), Type.Unknown()), {
    description: 'Rows keyed by column name, plus the row id.',
  }),
});

export type TableRowsPage = Static<typeof TableRowsPage>;
