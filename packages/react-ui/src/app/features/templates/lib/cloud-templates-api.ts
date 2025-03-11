import { OPENOPS_CLOUD_URL } from '@/app/constants/cloud';
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

export const cloudTemplatesApi = {
  getTemplate(templateId: string): Promise<FlowTemplateDto> {
    return api.get<FlowTemplateDto>(
      `${OPENOPS_CLOUD_URL}/api/v1/cloud-templates/${templateId}`,
      undefined,
      {
        withCredentials: true,
      },
    );
  },
  list(request: GetTemplatesParams) {
    return api.get<FlowTemplateMetadata[]>(
      `${OPENOPS_CLOUD_URL}/api/v1/cloud-templates`,
      request ?? {},
      {
        withCredentials: true,
      },
    );
  },
};
