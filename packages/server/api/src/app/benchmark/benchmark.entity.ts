import { Folder, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common';

export type BenchmarkSchema = {
  project: Project;
  folder: Folder;
} & BenchmarkRow;

export type BenchmarkRow = {
  id: string;
  created: string;
  updated: string;
  projectId: string;
  provider: string;
  folderId: string;
  connectionId: string;
  payload: Record<string, unknown>;
  deletedAt: string | null;
  lastRunId: string | null;
};

export const BenchmarkEntity = new EntitySchema<BenchmarkSchema>({
  name: 'benchmark',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    provider: {
      type: String,
      nullable: false,
    },
    folderId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    connectionId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    payload: {
      type: JSONB_COLUMN_TYPE,
      nullable: false,
    },
    deletedAt: {
      type: TIMESTAMP_COLUMN_TYPE,
      nullable: true,
    },
    lastRunId: {
      ...OpenOpsIdSchema,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_benchmark_project_id_deleted_at',
      columns: ['projectId', 'deletedAt'],
    },
    {
      name: 'idx_benchmark_project_id_deleted_at_created_desc',
      columns: ['projectId', 'deletedAt', 'created'],
    },
    {
      name: 'idx_benchmark_project_id_provider_deleted_at',
      columns: ['projectId', 'provider', 'deletedAt'],
    },
  ],
  relations: {
    project: {
      type: 'many-to-one',
      target: 'project',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'projectId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_benchmark_project',
      },
    },
    folder: {
      type: 'many-to-one',
      target: 'folder',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'folderId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_benchmark_folder',
      },
    },
  },
});
