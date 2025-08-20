import { Flow, FlowVersion, User } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

type FlowVersionSchema = {
  flow: Flow;
  updatedByUser: User;
} & FlowVersion;

export const FlowVersionEntity = new EntitySchema<FlowVersionSchema>({
  name: 'flow_version',
  columns: {
    ...BaseColumnSchemaPart,
    flowId: OpenOpsIdSchema,
    description: { type: String, nullable: true },
    displayName: {
      type: String,
    },
    trigger: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
    },
    updatedBy: {
      type: String,
      nullable: true,
    },
    valid: {
      type: Boolean,
    },
    state: {
      type: String,
    },
  },
  indices: [
    {
      name: 'idx_flow_version_flow_id',
      columns: ['flowId'],
      unique: false,
    },
  ],
  relations: {
    updatedByUser: {
      type: 'many-to-one',
      target: 'user',
      cascade: true,
      onDelete: 'SET NULL',
      joinColumn: {
        name: 'updatedBy',
        foreignKeyConstraintName: 'fk_updated_by_user_flow',
      },
    },
    flow: {
      type: 'many-to-one',
      target: 'flow',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'flowId',
        foreignKeyConstraintName: 'fk_flow_version_flow',
      },
    },
  },
});
