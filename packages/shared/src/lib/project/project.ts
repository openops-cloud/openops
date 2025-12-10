import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';
import { ProjectMemberRole } from './project-member';

export const ListProjectRequestForUserQueryParams = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number()),
});

export type ListProjectRequestForUserQueryParams = Static<
  typeof ListProjectRequestForUserQueryParams
>;

export type ProjectId = OpenOpsId;

export enum BlocksFilterType {
  NONE = 'NONE',
  ALLOWED = 'ALLOWED',
}

export const SwitchProjectResponse = Type.Object({
  token: Type.String(),
  projectRole: Type.Union([Type.Enum(ProjectMemberRole), Type.Null()]),
});

export type SwitchProjectResponse = Static<typeof SwitchProjectResponse>;

export const Project = Type.Object({
  ...BaseModelSchema,
  deleted: Nullable(Type.String()),
  ownerId: Type.String(),
  displayName: Type.String(),
  organizationId: OpenOpsId,
  tablesDatabaseId: Type.Integer(),
  tablesWorkspaceId: Type.Integer(),
  tablesDatabaseToken: Type.Object({
    iv: Type.String(),
    data: Type.String(),
  }),
});

export type Project = Static<typeof Project>;

export const UpdateProjectRequestInCommunity = Type.Object({
  displayName: Type.Optional(Type.String()),
});

export type UpdateProjectRequestInCommunity = Static<
  typeof UpdateProjectRequestInCommunity
>;
