import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import { AiSettingsFormSchema } from '@/app/features/ai/lib/ai-form-utils';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  INTERNAL_ERROR_TOAST,
  toast,
  TooltipWrapper,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { Trash } from 'lucide-react';

const AiSettingsPage = () => {
  const { data: aiProviders } = aiSettingsHooks.useAiSettingsProviders();

  const { data: aiSettings, refetch: refetchAiSettings } =
    aiSettingsHooks.useAiSettings();

  const { mutate: onSave, isPending: isSaving } = useMutation({
    mutationFn: async (aiSettings: AiSettingsFormSchema) => {
      return aiSettingsApi.saveAiSettings({
        ...aiSettings,
        projectId: authenticationSession.getProjectId()!,
      });
    },
    onSuccess: () => {
      refetchAiSettings();
      toast({
        title: 'Success',
        description: 'AI settings are saved successfully ',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: error.message,
        duration: 3000,
      });
    },
  });

  const { mutate: onDelete } = useMutation({
    mutationFn: async (id: string) => {
      return aiSettingsApi.deleteAiSettings(id);
    },
    onSuccess: () => {
      refetchAiSettings();
      toast({
        title: 'Success',
        description: 'AI settings are deleted successfully ',
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
        <h1 className="text-2xl font-bold mb-[35px]">{t('Ai providers')}</h1>
        <div className="flex justify-between p-6 border rounded-[11px]">
          <AiSettingsForm
            aiProviders={aiProviders}
            savedSettings={aiSettings?.[0]}
            onSave={onSave}
            isSaving={isSaving}
          />
          {aiSettings?.[0]?.id && (
            <TooltipWrapper tooltipText={t('Delete')}>
              <Trash
                size={24}
                role="button"
                className="text-destructive"
                aria-label="Delete"
                onClick={() => onDelete(aiSettings?.[0].id)}
              />
            </TooltipWrapper>
          )}
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'ProjectBlocksPage';
export { AiSettingsPage };
