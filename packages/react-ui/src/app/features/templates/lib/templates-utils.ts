import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { FlowTemplateMetadataWithIntegrations } from '@openops/components/ui';
import { FlowTemplateMetadata } from '@openops/shared';

export function addIntegrationsToTemplates(
  templates: FlowTemplateMetadata[],
  blocksLookup: Record<string, BlockMetadataModelSummary>,
): FlowTemplateMetadataWithIntegrations[] {
  return templates.map((template) => ({
    ...template,
    integrations: (template.blocks ?? [])
      .map((blockName) => blocksLookup[blockName])
      .filter(Boolean),
  }));
}
