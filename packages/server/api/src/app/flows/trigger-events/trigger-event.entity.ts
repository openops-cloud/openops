import { Flow, Project, TriggerEvent } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
} from '../../database/database-common';

type TriggerEventSchema = {
  flow: Flow;
  project: Project;
} & TriggerEvent;

export const TriggerEventEntity = new EntitySchema<TriggerEventSchema>({
  name: 'trigger_event',
  columns: {
    ...BaseColumnSchemaPart,
    flowId: OpenOpsIdSchema,
    projectId: OpenOpsIdSchema,
    sourceName: {
      type: String,
    },
    payload: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
    },
    input: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_trigger_event_flow_id',
      columns: ['flowId'],
      unique: false,
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
        foreignKeyConstraintName: 'fk_trigger_event_project_id',
      },
    },
    flow: {
      type: 'many-to-one',
      target: 'flow',
      cascade: true,
      onDelete: 'CASCADE',
      joinColumn: {
        name: 'flowId',
        foreignKeyConstraintName: 'fk_trigger_event_flow_id',
      },
    },
  },
});
