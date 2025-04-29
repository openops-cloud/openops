import { api } from '@/app/lib/api';
import { AiConfig, GetProvidersResponse } from '@openops/shared';

export const aiSettingsApi = {
  getProviderOptions(): Promise<GetProvidersResponse[]> {
    return api.get<GetProvidersResponse[]>('/v1/ai/providers');
  },
  saveAiSettings(payload: any): Promise<GetProvidersResponse> {
    return api.post<GetProvidersResponse>('/v1/ai/config', payload);
  },
  deleteAiSettings(id: string): Promise<any> {
    return api.delete<any>('/v1/ai/config/' + id);
  },
  getAiSettings(): Promise<AiConfig[]> {
    return api.get<AiConfig[]>('/v1/ai/config/');
  },
  getActiveAiSettings(): Promise<AiConfig> {
    return api.get<AiConfig>('/v1/ai/config/active');
  },
};
