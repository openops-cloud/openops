import { api } from '@/app/lib/api';
import {
  AppConnection,
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
  PatchAppConnectionRequestBody,
  SeekPage,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';

export const appConnectionsApi = {
  list(
    request: ListAppConnectionsRequestQuery,
  ): Promise<SeekPage<AppConnectionWithoutSensitiveData>> {
    return api.get<SeekPage<AppConnectionWithoutSensitiveData>>(
      '/v1/app-connections',
      request,
    );
  },
  get(id: string): Promise<AppConnection> {
    return api.get<AppConnection>(`/v1/app-connections/${id}`);
  },
  getByName(name: string): Promise<AppConnection> {
    return api.get<AppConnection>(`/v1/app-connections/by-name/${name}`);
  },
  getMetadata(): Promise<Record<string, any>> {
    return api.get<Record<string, any>>('/v1/app-connections/metadata');
  },
  patch(request: PatchAppConnectionRequestBody): Promise<AppConnection> {
    return api.patch<AppConnection>(`/v1/app-connections`, request);
  },
  upsert(request: UpsertAppConnectionRequestBody): Promise<AppConnection> {
    return api.post<AppConnection>('/v1/app-connections', request);
  },
  delete(id: string): Promise<void> {
    return api.delete<void>(`/v1/app-connections/${id}`);
  },
};
