import { QueryKeys } from '@/app/constants/query-keys';
import { AiConfigIndicator } from '@/app/features/ai/ai-config-indicator';
import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import {
  AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST,
  AiSettingsFormSchema,
  MCP_SETTINGS_SAVED_SUCCESSFULLY_TOAST,
} from '@/app/features/ai/lib/ai-form-utils';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { mcpSettingsHooks } from '@/app/features/ai/lib/mcp-settings-hooks';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { INTERNAL_ERROR_TOAST, Skeleton, toast } from '@openops/components/ui';
import {
  ApplicationErrorParams,
  ErrorCode,
  removeConnectionBrackets,
} from '@openops/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { t } from 'i18next';
import React, { useCallback } from 'react';

const AiSettingsPage = () => {
  const { data: aiSettings, refetch: refetchAiSettings } =
    aiSettingsHooks.useAiSettings();

  const { data: mcpSettings, refetch: refetchMcpSettings } =
    mcpSettingsHooks.useMcpSettings();

  const queryClient = useQueryClient();

  const { blockModel: aiBlockModel } = blocksHooks.useBlock({
    name: '@openops/block-ai',
  });

  const { blockModel: awsBlockModel } = blocksHooks.useBlock({
    name: '@openops/block-aws',
  });

  const { blockModel: gcpBlockModel } = blocksHooks.useBlock({
    name: '@openops/block-google-cloud',
  });

  const { mutate: onSaveAiSettings, isPending: isSavingAiSettings } =
    useMutation({
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
        const apError = error.response?.data as
          | ApplicationErrorParams
          | undefined;
        if (
          apError?.code ===
          ErrorCode.OPENAI_COMPATIBLE_PROVIDER_BASE_URL_REQUIRED
        ) {
          message = t('Base URL is required for OpenAI-compatible providers');
        } else if (error.response?.status === 400) {
          const data = error.response?.data as
            | { errorMessage?: string }
            | undefined;
          message = data?.errorMessage ?? error.message;
        } else {
          message = error.message;
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

  const isAiConfigured = !!aiSettings?.[0]?.connection;

  const handleSaveAiConfig = useCallback(
    (connectionName: string) =>
      onSaveAiSettings({
        ...aiSettings?.[0],
        enabled: !!connectionName,
        connection: connectionName,
      }),
    [onSaveAiSettings, aiSettings],
  );

  const handleSaveMcpConfig = useCallback(
    (connectionName: string) =>
      onSaveMcpSettings({
        ...mcpSettings,
        awsCost: {
          enabled: !!connectionName,
          connectionName: removeConnectionBrackets(connectionName) ?? '',
        },
      }),
    [onSaveMcpSettings, mcpSettings],
  );

  const handleSaveGcpMcpConfig = useCallback(
    (connectionName: string) =>
      onSaveMcpSettings({
        ...mcpSettings,
        gcp: {
          enabled: !!connectionName,
          connectionName: removeConnectionBrackets(connectionName) ?? '',
        },
      }),
    [onSaveMcpSettings, mcpSettings],
  );

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex flex-col gap-4">
        <h1 className="text-[24px] font-bold text-primary-900">
          {t('OpenOps AI')}
        </h1>
        <p className="text-base font-normal text-primary-900">
          {t(
            'Enable OpenOps Assistant and other AI-powered features such as the CLI command generation.',
          )}
        </p>
        <AiConfigIndicator enabled={isAiConfigured} />
        <div className="p-6 border rounded-[11px]">
          <div className="max-w-[648px] flex flex-col gap-4">
            <h3 className="text-base font-bold">{t('AI connection')}</h3>
            {aiBlockModel ? (
              <AiSettingsForm
                block={aiBlockModel}
                providerKey={'AI'}
                initialConnection={aiSettings?.[0]?.connection}
                onSave={handleSaveAiConfig}
                disabled={isSavingAiSettings}
                displayName={t('Select Connection')}
              />
            ) : (
              <Skeleton className="h-[78px]" />
            )}

            <h3 className="text-sm font-bold">{t('MCP')}</h3>
            {awsBlockModel ? (
              <AiSettingsForm
                block={awsBlockModel}
                providerKey={'AWS'}
                initialConnection={mcpSettings?.awsCost?.connectionName}
                onSave={handleSaveMcpConfig}
                disabled={
                  isSavingMcpSettings || !isAiConfigured || isSavingAiSettings
                }
                displayName={t('AWS Cost')}
                labelPlacement="left"
              />
            ) : (
              <Skeleton className="h-[78px]" />
            )}
            {gcpBlockModel ? (
              <AiSettingsForm
                block={gcpBlockModel}
                providerKey={'GCloud'}
                initialConnection={mcpSettings?.gcp?.connectionName}
                onSave={handleSaveGcpMcpConfig}
                disabled={
                  isSavingMcpSettings || !isAiConfigured || isSavingAiSettings
                }
                displayName={t('GCP')}
                labelPlacement="left"
              />
            ) : (
              <Skeleton className="h-[78px]" />
            )}
            {!isAiConfigured && (
              <p className="text-sm font-medium text-muted-foreground">
                {t('* Select an AI connection to use the MCP tools.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'AiSettingsPage';
export { AiSettingsPage };
