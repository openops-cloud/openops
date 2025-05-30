import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { FlowTemplateMetadata } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';

export const FlowTemplateMetadataWithIntegrations = Type.Composite([
  FlowTemplateMetadata,
  Type.Object({
    integrations: Type.Array(BlockMetadataModelSummary),
  }),
]);

export type FlowTemplateMetadataWithIntegrations = Static<
  typeof FlowTemplateMetadataWithIntegrations
>;

export type TemplateSidebarCategory = {
  name: string;
  services: string[];
};
