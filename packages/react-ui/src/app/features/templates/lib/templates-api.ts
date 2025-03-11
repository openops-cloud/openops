import { api } from '@/app/lib/api';
import { FlowTemplateDto, FlowTemplateMetadata } from '@openops/shared';

export type GetTemplatesParams = {
  search?: string;
  services?: string[];
  domains?: string[];
  blocks?: string[];
  tags?: string[];
  version?: string;
};

export const templatesApi = {
  getTemplate(templateId: string): Promise<FlowTemplateDto> {
    return api.get<FlowTemplateDto>(`/v1/flow-templates/${templateId}`);
  },
  list(request: GetTemplatesParams) {
    return api.get<FlowTemplateMetadata[]>(`/v1/flow-templates`, request ?? {});
  },
};
