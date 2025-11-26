import { QueryKeys } from '@/app/constants/query-keys';
import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import {
  AI_SETTINGS_DELETED_SUCCESSFULLY_TOAST,
  AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST,
  AiSettingsFormSchema,
  MCP_SETTINGS_DELETED_SUCCESSFULLY_TOAST,
  MCP_SETTINGS_SAVED_SUCCESSFULLY_TOAST,
} from '@/app/features/ai/lib/ai-form-utils';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { mcpSettingsHooks } from '@/app/features/ai/lib/mcp-settings-hooks';
import { McpSettingsForm } from '@/app/features/ai/mcp-settings-form';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import {
  INTERNAL_ERROR_TOAST,
  toast,
  TooltipWrapper,
} from '@openops/components/ui';
import { ApplicationErrorParams, ErrorCode } from '@openops/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { t } from 'i18next';
import { Trash } from 'lucide-react';

const AiSettingsPage = () => {
  const { data: aiSettings, refetch: refetchAiSettings } =
    aiSettingsHooks.useAiSettings();

  const { data: mcpSettings, refetch: refetchMcpSettings } =
    mcpSettingsHooks.useMcpSettings();

  const queryClient = useQueryClient();

  const { blockModel } = blocksHooks.useBlock({
    name: '@openops/block-ai',
  });

  const { mutate: onSaveAiSettings, isPending: isSaving } = useMutation({
    mutationFn: async (aiSettings: AiSettingsFormSchema) => {
      return aiSettingsApi.saveAiSettings(aiSettings);
    },
    onSuccess: async () => {
      refetchAiSettings();
      toast(AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST);
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.activeAiSettings],
      });
    },
    onError: (error: AxiosError) => {
      let message = '';
      const apError = error.response?.data as ApplicationErrorParams;
      if (
        apError.code === ErrorCode.OPENAI_COMPATIBLE_PROVIDER_BASE_URL_REQUIRED
      ) {
        message = t('Base URL is required for OpenAI-compatible providers');
      } else {
        message =
          error.status === 400
            ? (error.response?.data as { errorMessage: string })?.errorMessage
            : error.message;
      }
      toast({
        title: t('Error'),
        variant: 'destructive',
        description: message,
        duration: 3000,
      });
    },
  });

  const { mutate: onSaveMcpSettings, isPending: isSavingMcpSettings } =
    mcpSettingsHooks.useSaveMcpSettings({
      onSuccess: () => {
        refetchMcpSettings();
        toast(MCP_SETTINGS_SAVED_SUCCESSFULLY_TOAST);
      },
      onError: () => {
        toast(INTERNAL_ERROR_TOAST);
      },
    });

  const { mutate: onDeleteMcpSettings } = mcpSettingsHooks.useDeleteMcpSettings(
    {
      onSuccess: () => {
        refetchMcpSettings();
        toast(MCP_SETTINGS_DELETED_SUCCESSFULLY_TOAST);
      },
      onError: () => {
        toast(INTERNAL_ERROR_TOAST);
      },
    },
  );

  const { mutate: onDelete } = useMutation({
    mutationFn: async (id: string) => {
      return aiSettingsApi.deleteAiSettings(id);
    },
    onSuccess: () => {
      refetchAiSettings();
      toast(AI_SETTINGS_DELETED_SUCCESSFULLY_TOAST);
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex-col">
        <h1 className="text-2xl font-bold">{t('OpenOps AI')}</h1>
        {blockModel && (
          <div className="flex justify-between mt-[35px] p-6 border rounded-[11px]">
            <AiSettingsForm
              block={blockModel}
              savedSettings={aiSettings?.[0]}
              onSave={onSaveAiSettings}
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
        )}

        <div className="flex justify-between mt-[12px] mb-[22px] p-6 border rounded-[11px]">
          <McpSettingsForm
            onSave={onSaveMcpSettings}
            isSaving={isSavingMcpSettings}
            savedSettings={mcpSettings}
          />
          {mcpSettings?.id && (
            <TooltipWrapper tooltipText={t('Delete')}>
              <Trash
                size={24}
                role="button"
                className="text-destructive"
                aria-label="Delete"
                onClick={() => onDeleteMcpSettings(mcpSettings.id!)}
              />
            </TooltipWrapper>
          )}
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'AiSettingsPage';
export { AiSettingsPage };
