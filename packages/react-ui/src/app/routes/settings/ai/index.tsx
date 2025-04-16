import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { t } from 'i18next';

const AiSettingsPage = () => {
  const { data: aiProviders, isLoading } =
    aiSettingsHooks.useAiSettingsProviders();

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex-col">
        <h1 className="text-[24px] font-bold mb-[35px]">{t('Ai providers')}</h1>
        <div className="py-6 px-[60px] border rounded-[11px]">
          {!isLoading && <AiSettingsForm aiProviders={aiProviders} />}
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'ProjectBlocksPage';
export { AiSettingsPage };
