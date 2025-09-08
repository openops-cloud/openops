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
    contentType: {
      type: String,
      enum: ContentType,
      nullable: false,
      default: ContentType.WORKFLOW,
    },
  },
  indices: [
    {
      name: 'idx_folder_project_id_display_name',
      columns: ['projectId', 'displayName'],
      unique: true,
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
