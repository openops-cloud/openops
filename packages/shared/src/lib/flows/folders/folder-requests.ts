import { Static, Type } from '@sinclair/typebox';
import { ContentType } from './content-type';

export const CreateFolderRequest = Type.Object({
  displayName: Type.String(),
  parentFolderId: Type.Optional(Type.String()),
  contentType: Type.Optional(Type.Enum(ContentType)),
});

export type CreateFolderRequest = Static<typeof CreateFolderRequest>;

export const UpdateFolderRequest = Type.Object({
  displayName: Type.String(),
  parentFolderId: Type.Optional(Type.String()),
});

export type UpdateFolderRequest = Static<typeof UpdateFolderRequest>;

export const DeleteFolderRequest = Type.Object({
  id: Type.String(),
});

export type DeleteFlowRequest = Static<typeof DeleteFolderRequest>;

export const ListFolderFlowsRequest = Type.Object({
  excludeUncategorizedFolder: Type.Optional(Type.Boolean()),
  contentType: Type.Optional(Type.Enum(ContentType)),
});

export type ListFolderFlowsRequest = Static<typeof ListFolderFlowsRequest>;
