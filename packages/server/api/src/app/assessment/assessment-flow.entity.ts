import { Flow } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common';
import { AssessmentRow } from './assessment.entity';

export type AssessmentFlowRow = {
  id: string;
  created: string;
  updated: string;
  assessmentId: string;
  flowId: string;
  isOrchestrator: boolean;
  displayName: string | null;
  sortOrder: number | null;
  deletedAt: string | null;
};

export type AssessmentFlowSchema = {
  assessment?: AssessmentRow;
  flow?: Flow;
} & AssessmentFlowRow;

export const AssessmentFlowEntity = new EntitySchema<AssessmentFlowSchema>({
  name: 'assessment_flow',
  columns: {
    ...BaseColumnSchemaPart,
    assessmentId: {
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
    displayName: {
      type: String,
      nullable: true,
    },
    sortOrder: {
      type: Number,
      nullable: true,
    },
    deletedAt: {
      type: TIMESTAMP_COLUMN_TYPE,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_assessment_flow_assessment_id',
      columns: ['assessmentId'],
    },
    {
      name: 'idx_assessment_flow_flow_id',
      columns: ['flowId'],
    },
    // Partial unique (assessmentId, flowId) WHERE deletedAt IS NULL is in migration only
  ],
  relations: {
    assessment: {
      type: 'many-to-one',
      target: 'assessment',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'assessmentId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_assessment_flow_assessment',
      },
    },
    flow: {
      type: 'many-to-one',
      target: 'flow',
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'flowId',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_assessment_flow_flow',
      },
    },
  },
});
