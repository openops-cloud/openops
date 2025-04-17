// src/modules/ai-config/ai-config.entity.ts
import { Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

export type AiConfig = {
  id: string;
  created: string;
  updated: string;
  projectId: string;
  project: Project;
  provider: string;
  model: string;
  apiKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelSettings?: Record<string, any>;
  enabled?: boolean;
};

export const AiConfigEntity = new EntitySchema<AiConfig>({
  name: 'ai_config',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: OpenOpsIdSchema,
    provider: {
      type: String,
    },
    model: {
      type: String,
    },
    apiKey: {
      type: String,
    },
    modelSettings: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      nullable: true,
    },
  },
  relations: {
    project: {
      type: 'many-to-one',
      target: 'project',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        foreignKeyConstraintName: 'fk_ai_config_project',
      },
    },
  },
});
