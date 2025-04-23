// src/modules/ai-config/ai-config.entity.ts
import { AiConfig, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

export const AiApiKeyRedactionMessage = '**REDACTED**';

export type AiConfigSchema = AiConfig & {
  project: Project;
};

export const AiConfigEntity = new EntitySchema<AiConfigSchema>({
  name: 'ai_config',
  columns: {
    ...BaseColumnSchemaPart,
    provider: {
      type: String,
    },
    projectId: OpenOpsIdSchema,
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
    providerSettings: {
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
