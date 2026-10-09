import { Static, Type } from '@sinclair/typebox';

export const TableItem = Type.Object({
  id: Type.Number(),
  name: Type.String(),
});

export type TableItem = Static<typeof TableItem>;

export const TableColumnOption = Type.Object({
  id: Type.Number(),
  value: Type.String(),
});

export type TableColumnOption = Static<typeof TableColumnOption>;

export const TableColumn = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  primary: Type.Boolean(),
  readOnly: Type.Boolean(),
  options: Type.Optional(
    Type.Array(TableColumnOption, {
      description:
        'For single_select and multiple_select columns: the allowed options. Filter ' +
        'and write by the option value (label).',
    }),
  ),
});

export type TableColumn = Static<typeof TableColumn>;

export const TableDetails = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  url: Type.String({
    description: 'Link to open the table in the OpenOps UI.',
  }),
});

export type TableDetails = Static<typeof TableDetails>;
