import {
  AppConnection,
  AppConnectionStatus,
  EncryptedObject,
  Project,
} from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../database/database-common';

export type AppConnectionSchema = Omit<AppConnection, 'value'> & {
  project: Project;
  value: EncryptedObject;
};

export const AppConnectionEntity = new EntitySchema<AppConnectionSchema>({
  name: 'app_connection',
  columns: {
    ...BaseColumnSchemaPart,
    name: {
      type: String,
    },
    type: {
      type: String,
    },
    status: {
      type: String,
      default: AppConnectionStatus.ACTIVE,
    },
    projectId: OpenOpsIdSchema,
    value: {
      type: JSONB_COLUMN_TYPE,
    },
    authProviderKey: {
      type: String,
    },
  },
  indices: [
    {
      name: 'idx_app_connection_project_id_and_name',
      columns: ['projectId', 'name'],
      unique: true,
    },
  ],
  relations: {
    project: {
      type: 'many-to-one',
      target: 'project',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        foreignKeyConstraintName: 'fk_app_connection_app_project_id',
      },
    },
  },
});
