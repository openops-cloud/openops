import {
  IntegrationAuthorization,
  Organization,
  Project,
  User,
} from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  OpenOpsIdSchema,
} from '../database/database-common';

export type IntegrationAuthorizationSchema = IntegrationAuthorization & {
  project: Project;
  user: User;
  organization: Organization;
};

export const IntegrationAuthorizationEntity =
  new EntitySchema<IntegrationAuthorizationSchema>({
    name: 'integration_authorization',
    columns: {
      ...BaseColumnSchemaPart,
      userId: OpenOpsIdSchema,
      projectId: OpenOpsIdSchema,
      organizationId: OpenOpsIdSchema,
      token: {
        type: String,
      },
      integrationName: {
        type: String,
      },
      name: {
        type: String,
      },
      isRevoked: {
        type: Boolean,
        default: false,
      },
    },
    indices: [
      {
        name: 'idx_integration_authorization_project_id_and_name',
        columns: ['projectId', 'name'],
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
          foreignKeyConstraintName: 'fk_integration_authorization_project_id',
        },
      },
      user: {
        type: 'many-to-one',
        target: 'user',
        cascade: true,
        onDelete: 'CASCADE',
        joinColumn: {
          name: 'userId',
          foreignKeyConstraintName: 'fk_integration_authorization_user_id',
        },
      },
      organization: {
        type: 'many-to-one',
        target: 'organization',
        cascade: true,
        onDelete: 'CASCADE',
        joinColumn: {
          name: 'organizationId',
          foreignKeyConstraintName:
            'fk_integration_authorization_organization_id',
        },
      },
    },
  });
