import { Project, RefreshToken, User } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common';

export type RefreshTokenSchema = RefreshToken & {
  project: Project;
  user: User;
};

export const RefreshTokenEntity = new EntitySchema<RefreshTokenSchema>({
  name: 'refresh_token',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: OpenOpsIdSchema,
    userId: OpenOpsIdSchema,
    client: {
      type: String,
    },
    refreshToken: {
      type: String,
      unique: true,
    },
    principal: {
      type: JSONB_COLUMN_TYPE,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: TIMESTAMP_COLUMN_TYPE,
      nullable: true,
    },
    expirationTime: {
      type: TIMESTAMP_COLUMN_TYPE,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_refresh_token_project_id_and_client',
      columns: ['projectId', 'client'],
    },
    {
      name: 'idx_refresh_token_token_project_user_client_active',
      columns: ['refreshToken', 'projectId', 'userId', 'client'],
      unique: true,
      where: '"isRevoked" = false',
    },
  ],
  relations: {
    project: {
      type: 'many-to-one',
      target: 'project',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        foreignKeyConstraintName: 'fk_refresh_token_project_id',
      },
    },
    user: {
      type: 'many-to-one',
      target: 'user',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'userId',
        foreignKeyConstraintName: 'fk_refresh_token_user_id',
      },
    },
  },
});
