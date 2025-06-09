import { Static, Type } from '@sinclair/typebox';
import { AppConnectionStatus } from '../app-connection';

export const ListAppConnectionsRequestQuery = Type.Object({
  cursor: Type.Optional(Type.String({})),
  blockNames: Type.Optional(Type.Array(Type.String({}))),
  name: Type.Optional(Type.String({})),
  status: Type.Optional(Type.Array(Type.Enum(AppConnectionStatus))),
  limit: Type.Optional(Type.Number({})),
  authProviders: Type.Optional(Type.Array(Type.String({}))),
});
export type ListAppConnectionsRequestQuery = Static<
  typeof ListAppConnectionsRequestQuery
>;
