import { ContentType, Flow, Folder, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  OpenOpsIdSchema,
} from '../../database/database-common';

export type FolderSchema = {
  flows: Flow[];
  project: Project;
  parentFolder?: Folder;
  subfolders?: Folder[];
} & Folder;

export const FolderEntity = new EntitySchema<FolderSchema>({
  name: 'folder',
  columns: {
    ...BaseColumnSchemaPart,
    displayName: {
      type: String,
    },
    projectId: OpenOpsIdSchema,
    parentFolderId: {
      ...OpenOpsIdSchema,
      nullable: true,
    },
    contentType: {
      type: String,
      enum: ContentType,
      nullable: false,
    },
  },
  indices: [
    {
      name: 'idx_folder_project_id_display_name_content_type',
      columns: ['projectId', 'displayName', 'contentType'],
      unique: true,
      where: '"parentFolderId" IS NULL',
    },
    {
      name: 'idx_folder_project_id_parent_display_name_content_type',
      columns: ['projectId', 'parentFolderId', 'displayName', 'contentType'],
      unique: true,
      where: '"parentFolderId" IS NOT NULL',
    },
  ],
  relations: {
    flows: {
      type: 'one-to-many',
      target: 'flow',
      inverseSide: 'folder',
    },
    project: {
      type: 'many-to-one',
      target: 'project',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_folder_project',
      },
    },
    parentFolder: {
      type: 'many-to-one',
      target: 'folder',
      cascade: true,
      onDelete: 'CASCADE',
      nullable: true,
      joinColumn: {
        name: 'parentFolderId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_folder_parent_folder',
      },
    },
    subfolders: {
      type: 'one-to-many',
      target: 'folder',
      inverseSide: 'parentFolder',
    },
  },
});
