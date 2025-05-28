import { Static, Type } from '@sinclair/typebox';

export const CreateFolderRequest = Type.Object({
  displayName: Type.String(),
  projectId: Type.String(),
  parentFolderId: Type.Optional(Type.String()),
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
});

export type ListFolderFlowsRequest = Static<typeof ListFolderFlowsRequest>;
