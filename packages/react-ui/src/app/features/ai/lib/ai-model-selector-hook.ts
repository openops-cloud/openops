import { QueryKeys } from '@/app/constants/query-keys';
import { AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST } from '@/app/features/ai/lib/ai-form-utils';
import { appConnectionsApi } from '@/app/features/connections/lib/app-connections-api';
import { appConnectionsHooks } from '@/app/features/connections/lib/app-connections-hooks';
import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import {
  AiConfigParsed,
  CustomAuthConnection,
  removeConnectionBrackets,
} from '@openops/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiSettingsHooks } from './ai-settings-hooks';

export const useAiModelSelector = () => {
  const queryClient = useQueryClient();
  const { data: activeConfig, isLoading: isLoadingActiveConfig } =
    aiSettingsHooks.useActiveAiSettings();

  const { data: con, isPending: isPendingConnection } =
    appConnectionsHooks.useConnectionByName({
      name: removeConnectionBrackets(activeConfig?.connection),
    });

  const connection = con as CustomAuthConnection;

  const connectionProps =
    (connection?.value?.props as AiConfigParsed & {
      customModel?: string;
    }) ?? {};

  const { data: provider, isLoading: isLoadingProviderModels } =
    aiSettingsHooks.useProviderModels(connectionProps?.provider ?? null);

  const { mutate: updateConnection, isPending: isSaving } = useMutation({
    mutationFn: (model: string) => {
      if (!connection) {
        throw new Error('No AI connection found');
      }

      const updatedProps = {
        ...connectionProps,
        model,
        customModel: null,
      } as Record<string, unknown>;

      return appConnectionsApi.patch({
        id: connection.id,
        name: connection.name,
        authProviderKey: connection.authProviderKey,
        type: connection.type,
        value: {
          ...connection.value,
          type: connection.value?.type,
          props: updatedProps,
        } as any,
      } as any);
    },
    onSuccess: () => {
      toast(AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.appConnections] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.appConnection, connection?.name],
      });
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  return {
    selectedModel: connectionProps?.customModel || connectionProps?.model,
    availableModels: provider?.models ?? [],
    isLoading:
      isLoadingActiveConfig ||
      isPendingConnection ||
      isLoadingProviderModels ||
      isSaving,
    onModelSelected: updateConnection,
  };
};
