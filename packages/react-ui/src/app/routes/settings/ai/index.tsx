import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import { AiSettingsFormSchema } from '@/app/features/ai/lib/ai-form-utils';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';

const AiSettingsPage = () => {
  const { data: aiProviders } = aiSettingsHooks.useAiSettingsProviders();

  const { data: aiSettings } = aiSettingsHooks.useAiSettings();

  const { mutate: onSave, isPending: isSaving } = useMutation({
    mutationFn: async (aiSettings: AiSettingsFormSchema) => {
      return aiSettingsApi.saveAiSettings(aiSettings);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'AI settings are saved successfully ',
        duration: 3000,
      });
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex-col">
        <h1 className="text-[24px] font-bold mb-[35px]">{t('Ai providers')}</h1>
        <div className="py-6 px-[60px] border rounded-[11px]">
          <AiSettingsForm
            aiProviders={aiProviders}
            currentSettings={aiSettings}
            onSave={onSave}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'ProjectBlocksPage';
export { AiSettingsPage };
