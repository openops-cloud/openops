import { Type } from '@sinclair/typebox';

/** Shared query param values for list sorting (ascending / descending). */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const SortDirectionSchema = Type.Enum(SortDirection);
