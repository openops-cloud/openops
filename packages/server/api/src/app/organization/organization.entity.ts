import { Organization, User } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  OpenOpsIdSchema,
} from '../database/database-common';

type OrganizationSchema = Organization & {
  owner: User;
};

export const OrganizationEntity = new EntitySchema<OrganizationSchema>({
  name: 'organization',
  columns: {
    ...BaseColumnSchemaPart,
    ownerId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    name: {
      type: String,
      nullable: false,
    },
  },
  indices: [],
  relations: {
    owner: {
      type: 'one-to-one',
      target: 'user',
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
      joinColumn: {
        name: 'ownerId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_organization_user',
      },
    },
  },
});
