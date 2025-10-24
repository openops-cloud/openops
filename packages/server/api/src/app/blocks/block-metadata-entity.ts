import { BlockMetadataModel } from '@openops/blocks-framework';
import { BaseModel, OpenOpsId, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  ARRAY_COLUMN_TYPE,
  BaseColumnSchemaPart,
  COLLATION,
  isPostgres,
  JSON_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../database/database-common';

type BlockMetadataSchemaWithRelations = BlockMetadataSchema & {
  project: Project;
};

export type BlockMetadataSchema = BaseModel<OpenOpsId> & BlockMetadataModel;

export const BlockMetadataEntity =
  new EntitySchema<BlockMetadataSchemaWithRelations>({
    name: 'block_metadata',
    columns: {
      ...BaseColumnSchemaPart,
      name: {
        type: String,
        nullable: false,
      },
      authors: {
        type: ARRAY_COLUMN_TYPE,
        nullable: false,
        array: isPostgres(),
      },
      displayName: {
        type: String,
        nullable: false,
      },
      logoUrl: {
        type: String,
        nullable: false,
      },
      displayIcon: {
        type: String,
        nullable: true,
      },
      projectUsage: {
        type: Number,
        nullable: false,
        default: 0,
      },
      description: {
        type: String,
        nullable: true,
      },
      projectId: {
        type: String,
        nullable: true,
      },
      organizationId: {
        type: String,
        nullable: true,
      },
      version: {
        type: String,
        nullable: false,
        collation: COLLATION,
      },
      minimumSupportedRelease: {
        type: String,
        nullable: false,
        collation: COLLATION,
      },
      maximumSupportedRelease: {
        type: String,
        nullable: false,
        collation: COLLATION,
      },
      auth: {
        type: JSON_COLUMN_TYPE,
        nullable: true,
      },
      actions: {
        type: JSON_COLUMN_TYPE,
        nullable: false,
      },
      triggers: {
        type: JSON_COLUMN_TYPE,
        nullable: false,
      },
      blockType: {
        type: String,
        nullable: false,
      },
      categories: {
        type: ARRAY_COLUMN_TYPE,
        nullable: true,
        array: isPostgres(),
      },
      packageType: {
        type: String,
        nullable: false,
      },
      archiveId: {
        ...OpenOpsIdSchema,
        nullable: true,
      },
    },
    indices: [
      {
        name: 'idx_block_metadata_name_project_id_version',
        columns: ['name', 'version', 'projectId'],
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
          foreignKeyConstraintName: 'fk_block_metadata_project_id',
        },
        nullable: true,
      },
      archiveId: {
        type: 'one-to-one',
        target: 'file',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
        joinColumn: {
          name: 'archiveId',
          referencedColumnName: 'id',
          foreignKeyConstraintName: 'fk_block_metadata_file',
        },
      },
    },
  });
