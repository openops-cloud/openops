import {
  AppConnection,
  Flow,
  Folder,
  Project,
  TriggerEvent,
  User,
} from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common';

type ProjectSchema = Project & {
  owner: User;
  flows: Flow[];
  files: File[];
  folders: Folder[];
  events: TriggerEvent[];
  appConnections: AppConnection[];
};

export const ProjectEntity = new EntitySchema<ProjectSchema>({
  name: 'project',
  columns: {
    ...BaseColumnSchemaPart,
    deleted: {
      type: TIMESTAMP_COLUMN_TYPE,
      deleteDate: true,
      nullable: true,
    },
    ownerId: OpenOpsIdSchema,
    displayName: {
      type: String,
    },
    organizationId: {
      ...OpenOpsIdSchema,
    },
    tablesDatabaseId: {
      type: Number,
      nullable: false,
    },
    tablesWorkspaceId: {
      type: Number,
      nullable: false,
    },
    tablesDatabaseToken: {
      type: JSONB_COLUMN_TYPE,
      nullable: false,
    },
    color: {
      type: String,
      nullable: false,
    },
  },
  indices: [
    {
      name: 'idx_project_owner_id',
      columns: ['ownerId'],
      unique: false,
    },
  ],
  relations: {
    owner: {
      type: 'many-to-one',
      target: 'user',
      joinColumn: {
        name: 'ownerId',
        foreignKeyConstraintName: 'fk_project_owner_id',
      },
    },
    folders: {
      type: 'one-to-many',
      target: 'folder',
      inverseSide: 'project',
    },
    appConnections: {
      type: 'one-to-many',
      target: 'app_connection',
      inverseSide: 'project',
    },
    events: {
      type: 'one-to-many',
      target: 'trigger_event',
      inverseSide: 'project',
    },
    files: {
      type: 'one-to-many',
      target: 'file',
      inverseSide: 'project',
    },
    flows: {
      type: 'one-to-many',
      target: 'flow',
      inverseSide: 'project',
    },
  },
});
