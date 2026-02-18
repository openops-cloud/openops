import { Flow } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common';
import { BenchmarkRow } from './benchmark.entity';

export type BenchmarkFlowRow = {
  id: string;
  created: string;
  updated: string;
  benchmarkId: string;
  flowId: string;
  isOrchestrator: boolean;
  deletedAt: string | null;
};

export type BenchmarkFlowSchema = {
  benchmark?: BenchmarkRow;
  flow?: Flow;
} & BenchmarkFlowRow;

export const BenchmarkFlowEntity = new EntitySchema<BenchmarkFlowSchema>({
  name: 'benchmark_flow',
  columns: {
    ...BaseColumnSchemaPart,
    benchmarkId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    flowId: {
      ...OpenOpsIdSchema,
      nullable: false,
    },
    isOrchestrator: {
      type: Boolean,
      nullable: false,
      default: false,
    },
    deletedAt: {
      type: TIMESTAMP_COLUMN_TYPE,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_benchmark_flow_benchmark_id',
      columns: ['benchmarkId'],
    },
    {
      name: 'idx_benchmark_flow_flow_id',
      columns: ['flowId'],
    },
  ],
  relations: {
    benchmark: {
      type: 'many-to-one',
      target: 'benchmark',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'benchmarkId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_benchmark_flow_benchmark',
      },
    },
    flow: {
      type: 'many-to-one',
      target: 'flow',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'flowId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_benchmark_flow_flow',
      },
    },
  },
});
