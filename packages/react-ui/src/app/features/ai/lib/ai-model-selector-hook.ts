import { aiSettingsHooks } from './ai-settings-hooks';

export const useAiModelSelector = () => {
  const { data: activeConfig, isLoading: isLoadingActiveConfig } =
    aiSettingsHooks.useActiveAiSettings();

  const { data: provider, isLoading: isLoadingProviderModels } =
    aiSettingsHooks.useProviderModels(activeConfig?.provider ?? '');

  const { mutate: updateAiSetting, isPending: isSaving } =
    aiSettingsHooks.useSaveAiSettings();

  const onModelSelected = (model: string) => {
    if (!activeConfig?.provider) return;

    updateAiSetting({
      ...activeConfig,
      model,
    });
  };

  return {
    selectedModel: activeConfig?.model ?? '',
    availableModels: provider?.models ?? [],
    isLoading: isLoadingActiveConfig || isLoadingProviderModels || isSaving,
    onModelSelected,
  };
};
