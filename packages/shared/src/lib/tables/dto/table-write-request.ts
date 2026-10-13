import { Static, Type } from '@sinclair/typebox';

// The common batch helpers split larger inputs into 200-row Baserow calls, which would
// make a single request partially applied if a later chunk failed. Capping at one chunk
// keeps create/update/delete all-or-nothing.
export const MAX_TABLE_ROWS_PER_WRITE = 200;

const RowFields = Type.Record(Type.String(), Type.Unknown(), {
  description:
    'Cell values keyed by column name, as returned by Get Table Columns.',
});

export const CreateTableRowsRequestBody = Type.Object({
  rows: Type.Array(RowFields, {
    minItems: 1,
    maxItems: MAX_TABLE_ROWS_PER_WRITE,
  }),
});

export type CreateTableRowsRequestBody = Static<
  typeof CreateTableRowsRequestBody
>;

export const UpdateTableRowsRequestBody = Type.Object({
  rows: Type.Array(
    Type.Object({
      id: Type.Integer({
        description: 'Row id, as returned by Query Table Rows.',
      }),
      fields: RowFields,
    }),
    { minItems: 1, maxItems: MAX_TABLE_ROWS_PER_WRITE },
  ),
});

export type UpdateTableRowsRequestBody = Static<
  typeof UpdateTableRowsRequestBody
>;

export const DeleteTableRowsQuery = Type.Object({
  ids: Type.Array(Type.Integer(), {
    minItems: 1,
    maxItems: MAX_TABLE_ROWS_PER_WRITE,
    description: 'Row ids to delete, as returned by Query Table Rows.',
  }),
});

export type DeleteTableRowsQuery = Static<typeof DeleteTableRowsQuery>;

export const TableRowsWriteResult = Type.Object({
  rows: Type.Array(Type.Record(Type.String(), Type.Unknown())),
});

export type TableRowsWriteResult = Static<typeof TableRowsWriteResult>;

export const TableRowsDeleteResult = Type.Object({
  deleted: Type.Integer(),
});

export type TableRowsDeleteResult = Static<typeof TableRowsDeleteResult>;

// Table and column (schema) writes.

// Column types an agent can create or convert to. The fork has 26; the rest are left out:
// - they reference other tables or fields: link_row, lookup, rollup, count, formula
// - Tables fills them itself: created_on, created_by, last_modified, last_modified_by,
//   uuid, autonumber
// - they need data an agent cannot pass as a plain value: file (an upload),
//   multiple_collaborators (Tables user ids), password
// - not needed yet, but simple to add: rating, duration, phone_number
export enum TableColumnType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  SINGLE_SELECT = 'single_select',
  MULTIPLE_SELECT = 'multiple_select',
  URL = 'url',
  EMAIL = 'email',
}

export const CreateTableRequestBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  data: Type.Array(Type.Array(Type.String(), { minItems: 1 }), {
    minItems: 1,
    // The header row plus up to MAX_TABLE_ROWS_PER_WRITE starting rows.
    maxItems: MAX_TABLE_ROWS_PER_WRITE + 1,
    description:
      'The first row is the column names; any further rows are starting rows, one ' +
      'string per column. Every row must have as many cells as the header.',
  }),
});

export type CreateTableRequestBody = Static<typeof CreateTableRequestBody>;

const ColumnTypeOptions = {
  selectOptions: Type.Optional(
    Type.Array(Type.String({ minLength: 1, maxLength: 255 }), {
      description:
        'For single_select and multiple_select: the option labels. On update this is ' +
        'the full list; existing labels keep their values, and cells holding a label ' +
        'that is left out are cleared.',
    }),
  ),
  decimalPlaces: Type.Optional(
    Type.Integer({
      minimum: 0,
      maximum: 10,
      description: 'For number: digits after the decimal point.',
    }),
  ),
  includeTime: Type.Optional(
    Type.Boolean({ description: 'For date: store a time as well as a date.' }),
  ),
};

const ColumnName = Type.String({ minLength: 1, maxLength: 255 });

export const AddTableColumnRequestBody = Type.Object({
  name: ColumnName,
  type: Type.Enum(TableColumnType),
  ...ColumnTypeOptions,
});

export type AddTableColumnRequestBody = Static<
  typeof AddTableColumnRequestBody
>;

export const UpdateTableColumnRequestBody = Type.Object(
  {
    name: Type.Optional(ColumnName),
    type: Type.Optional(Type.Enum(TableColumnType)),
    ...ColumnTypeOptions,
  },
  { minProperties: 1 },
);

export type UpdateTableColumnRequestBody = Static<
  typeof UpdateTableColumnRequestBody
>;

export const TableColumnDeleteResult = Type.Object({
  id: Type.Integer(),
});

export type TableColumnDeleteResult = Static<typeof TableColumnDeleteResult>;
