import { Static, Type } from '@sinclair/typebox';

export const TableItem = Type.Object({
  id: Type.Number(),
  name: Type.String(),
});

export type TableItem = Static<typeof TableItem>;

export const TableColumn = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  primary: Type.Boolean(),
  readOnly: Type.Boolean(),
});

export type TableColumn = Static<typeof TableColumn>;

/**
 * Row filter operators. The values are Baserow's own filter names, which is what the
 * Tables API expects on the wire, so no translation table is needed on either side.
 */
export enum TableRowFilterOperator {
  equal = 'equal',
  not_equal = 'not_equal',
  contains = 'contains',
  contains_not = 'contains_not',
  empty = 'empty',
  not_empty = 'not_empty',
  boolean = 'boolean',
  higher_than = 'higher_than',
  higher_than_or_equal = 'higher_than_or_equal',
  lower_than = 'lower_than',
  lower_than_or_equal = 'lower_than_or_equal',
  date_equal = 'date_equal',
  date_before = 'date_before',
  date_before_or_equal = 'date_before_or_equal',
  date_after = 'date_after',
  date_after_or_equal = 'date_after_or_equal',
  date_is_on_or_before = 'date_is_on_or_before',
  date_is_on_or_after = 'date_is_on_or_after',
  date_is_within = 'date_is_within',
  single_select_equal = 'single_select_equal',
  single_select_not_equal = 'single_select_not_equal',
  single_select_is_any_of = 'single_select_is_any_of',
  single_select_is_none_of = 'single_select_is_none_of',
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

export const QueryTableRowsRequest = Type.Object({
  filters: Type.Optional(Type.Array(TableRowFilter)),
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

export type QueryTableRowsRequest = Static<typeof QueryTableRowsRequest>;

export const TableRowsPage = Type.Object({
  count: Type.Number({
    description: 'Total number of rows matching the query, across all pages.',
  }),
  hasMore: Type.Boolean(),
  results: Type.Array(Type.Record(Type.String(), Type.Unknown())),
});

export type TableRowsPage = Static<typeof TableRowsPage>;
