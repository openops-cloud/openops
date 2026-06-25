import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { FlowTemplateMetadata } from '@openops/shared';

export type FlowTemplateMetadataWithIntegrations = FlowTemplateMetadata & {
  integrations: BlockMetadataModelSummary[];
};

export type TemplateSidebarCategory = {
  name: string;
  services: string[];
};
