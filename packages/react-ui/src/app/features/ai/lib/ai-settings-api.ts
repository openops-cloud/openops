import { AiSettingsFormSchema } from '@/app/features/ai/lib/ai-form-utils';
import { api } from '@/app/lib/api';
import { GetProvidersResponse } from '@openops/shared';

export const aiSettingsApi = {
  getProviderOptions(): Promise<any> {
    return api.get<GetProvidersResponse>('/v1/ai/providers');
  },
  saveAiSettings(payload: any): Promise<void> {
    localStorage.setItem('ai-settings', JSON.stringify(payload));
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });
  },
  getAiSettings(): Promise<AiSettingsFormSchema> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(JSON.parse(localStorage.getItem('ai-settings') || '{}'));
      }, 3000);
    });
  },
};
