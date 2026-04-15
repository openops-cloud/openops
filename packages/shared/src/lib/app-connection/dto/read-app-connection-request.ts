import { Static, Type } from '@sinclair/typebox';
import { SortDirectionSchema } from '../../common/sort-direction';
import { AppConnectionStatus } from '../app-connection';

export enum AppConnectionSortBy {
  NAME = 'name',
  CREATED = 'created',
  UPDATED = 'updated',
}

export const ListAppConnectionsRequestQuery = Type.Object({
  cursor: Type.Optional(Type.String({})),
  name: Type.Optional(Type.String({})),
  status: Type.Optional(Type.Array(Type.Enum(AppConnectionStatus))),
  limit: Type.Optional(Type.Number({})),
  authProviders: Type.Optional(Type.Array(Type.String({}))),
  sortBy: Type.Optional(Type.Enum(AppConnectionSortBy)),
  sortDirection: Type.Optional(SortDirectionSchema),
});
export type ListAppConnectionsRequestQuery = Static<
  typeof ListAppConnectionsRequestQuery
>;
