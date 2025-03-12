import { FlowTemplateDto, Organization, Project } from '@openops/shared';
import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
} from '../database/database-common';

export type FlowTemplateSchema = FlowTemplateDto & {
  project: Project;
  organization: Organization;
  minSupportedVersion?: string;
  maxSupportedVersion?: string;
};

export const FlowTemplateEntity = new EntitySchema<FlowTemplateSchema>({
  name: 'flow_template',
  columns: {
    ...BaseColumnSchemaPart,
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
    },
    tags: {
      type: JSONB_COLUMN_TYPE,
    },
    services: {
      type: JSONB_COLUMN_TYPE,
    },
    domains: {
      type: JSONB_COLUMN_TYPE,
    },
    blocks: {
      type: JSONB_COLUMN_TYPE,
    },
    pieces: {
      type: JSONB_COLUMN_TYPE,
      nullable: true,
    },
    template: {
      type: JSONB_COLUMN_TYPE,
    },
    projectId: {
      type: String,
    },
    organizationId: {
      type: String,
    },
    isSample: {
      type: Boolean,
      default: false,
    },
    isGettingStarted: {
      type: Boolean,
      default: false,
    },
    minSupportedVersion: {
      type: String,
      nullable: true,
    },
    maxSupportedVersion: {
      type: String,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'idx_flow_template_project_id',
      columns: ['projectId'],
      unique: false,
    },
    {
      name: 'idx_flow_template_organization_id',
      columns: ['organizationId'],
      unique: false,
    },
  ],
  relations: {
    project: {
      type: 'many-to-one',
      target: 'project',
      joinColumn: {
        name: 'projectId',
        referencedColumnName: 'id',
      },
    },
    organization: {
      type: 'many-to-one',
      target: 'organization',
      joinColumn: {
        name: 'organizationId',
        referencedColumnName: 'id',
      },
    },
  },
});
