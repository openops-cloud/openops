import { FlowStepTestOutput, FlowVersion } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  BLOB_COLUMN_TYPE,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

type FlowStepTestOutputSchema = {
  flowVersion: FlowVersion;
} & FlowStepTestOutput;

export const FlowStepTestOutputEntity =
  new EntitySchema<FlowStepTestOutputSchema>({
    name: 'flow_step_test_output',
    columns: {
      ...BaseColumnSchemaPart,
      stepId: OpenOpsIdSchema,
      flowVersionId: OpenOpsIdSchema,
      input: {
        type: JSONB_COLUMN_TYPE,
        nullable: false,
      },
      output: {
        type: JSONB_COLUMN_TYPE,
        nullable: false,
      },
      success: {
        type: Boolean,
        default: true,
      },
    },
    indices: [
      {
        name: 'UQ_flow_step_test_output_step_id_flow_version_id',
        columns: ['stepId', 'flowVersionId'],
        unique: true,
      },
    ],
    relations: {
      flowVersion: {
        type: 'many-to-one',
        target: 'flow_version',
        joinColumn: {
          name: 'flowVersionId',
        },
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      },
    },
  });
