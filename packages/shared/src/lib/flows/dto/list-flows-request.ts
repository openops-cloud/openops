import { Static, Type } from '@sinclair/typebox';
import { Cursor } from '../../common/seek-page';
import { FlowStatus } from '../flow';
import { FlowVersionState } from '../flow-version';

export enum FlowSortBy {
  NAME = 'name',
  CREATED = 'created',
  UPDATED = 'updated',
}

export enum FlowSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const ListFlowsRequest = Type.Object({
  folderId: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({})),
  cursor: Type.Optional(Type.String({})),
  status: Type.Optional(Type.Array(Type.Enum(FlowStatus))),
  versionState: Type.Optional(Type.Array(Type.Enum(FlowVersionState))),
  name: Type.Optional(Type.String({})),
  sortBy: Type.Optional(Type.Enum(FlowSortBy)),
  sortDirection: Type.Optional(Type.Enum(FlowSortDirection)),
});

export type ListFlowsRequest = Omit<
  Static<typeof ListFlowsRequest>,
  'cursor'
> & { cursor: Cursor | undefined };

export const GetFlowQueryParamsRequest = Type.Object({
  versionId: Type.Optional(Type.String({})),
});

export type GetFlowQueryParamsRequest = Static<
  typeof GetFlowQueryParamsRequest
>;

export const ListFlowVersionRequest = Type.Object({
  limit: Type.Optional(Type.Number({})),
  cursor: Type.Optional(Type.String({})),
});

export type ListFlowVersionRequest = Omit<
  Static<typeof ListFlowVersionRequest>,
  'cursor'
> & { cursor: Cursor | undefined };
