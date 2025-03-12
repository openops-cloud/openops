import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common';
import { FlowVersion } from '../flow-version';
import { Trigger } from '../triggers/trigger';
export const FlowVersionTemplate = Type.Omit(FlowVersion, [
  'id',
  'created',
  'updated',
  'flowId',
  'state',
  'updatedBy',
]);

export type FlowVersionTemplate = Static<typeof FlowVersionTemplate>;

export enum TemplateType {
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
}

export const FlowTemplateMetadata = Type.Object({
  ...BaseModelSchema,
  name: Type.String(),
  description: Type.Optional(Type.String()),
  type: Type.Enum(TemplateType),
  tags: Type.Array(Type.String()),
  services: Type.Array(Type.String()),
  domains: Type.Array(Type.String()),
  blocks: Type.Optional(Type.Array(Type.String())),
  pieces: Type.Optional(Type.Array(Type.String())),
  isSample: Type.Optional(Type.Boolean()),
  isGettingStarted: Type.Optional(Type.Boolean()),
  projectId: Type.String(),
  organizationId: Type.String(),
});

export type FlowTemplateMetadata = Static<typeof FlowTemplateMetadata>;

export const FlowImportTemplate = Type.Composite([
  FlowTemplateMetadata,
  Type.Object({ template: FlowVersionTemplate }),
]);

export type FlowImportTemplate = Static<typeof FlowImportTemplate>;

export const FlowTemplateDto = Type.Composite([
  FlowTemplateMetadata,
  Type.Object({ template: Trigger }),
]);

export type FlowTemplateDto = Static<typeof FlowTemplateDto>;

export const FlowTemplateWithoutProjectInformation = Type.Omit(
  FlowImportTemplate,
  ['projectId', 'organizationId', 'id', 'type'],
);
export type FlowTemplateWithoutProjectInformation = Static<
  typeof FlowTemplateWithoutProjectInformation
>;

export const ListFlowTemplatesRequest = Type.Object({
  blocks: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
  search: Type.Optional(Type.String()),
});

export type ListFlowTemplatesRequest = Static<typeof ListFlowTemplatesRequest>;

export const GetFlowTemplateRequestQuery = Type.Object({
  versionId: Type.Optional(Type.String()),
});

export type GetFlowTemplateRequestQuery = Static<
  typeof GetFlowTemplateRequestQuery
>;
