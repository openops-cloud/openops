import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { toast } from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { aiSettingsHooks } from './ai-settings-hooks';

export const useAiModelSelector = ({
  chatId,
  provider,
  model,
}: {
  chatId: string | null;
  provider?: string;
  model?: string;
}) => {
  const [selectedModel, setSelectedModel] = useState<string | undefined>(model);

  useEffect(() => {
    if (model) {
      setSelectedModel(model);
    }
  }, [model]);

  const { data: providerModels, isLoading: isLoadingProviderModels } =
    aiSettingsHooks.useProviderModels(provider ?? null);

  const { mutate: updateAiSetting, isPending: isSaving } = useMutation({
    mutationFn: ({ chatId, newModel }: { chatId: string; newModel: string }) =>
      aiAssistantChatApi.updateModel({ chatId, model: newModel }),
    onSuccess: (data) => {
      setSelectedModel(data.model);
    },
    onError: (error: AxiosError) => {
      toast({
        title: t('Error'),
        variant: 'destructive',
        description: error.message,
        duration: 3000,
      });
    },
  });

  const onModelSelected = (newModel: string) => {
    if (!provider || !newModel || !chatId) return;

    updateAiSetting({
      chatId,
      newModel,
    });
  };

  return {
    selectedModel,
    selectedProvider: provider,
    availableModels:
      providerModels?.models.map((m) => ({ name: m, provider })) ?? [],
    isLoading: isLoadingProviderModels || isSaving,
    onModelSelected,
  };
};
