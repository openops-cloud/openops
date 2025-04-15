import { AiSettingsForm } from '@/app/features/ai/ai-settings-form';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { t } from 'i18next';

const AiSettingsPage = () => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex-col">
        <div className="mb-4 flex">
          <h1 className="text-[24px] font-bold">{t('Ai providers')}</h1>
          <div className="ml-auto">
            <DynamicFormValidationProvider>
              <AiSettingsForm />
            </DynamicFormValidationProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

AiSettingsPage.displayName = 'ProjectBlocksPage';
export { AiSettingsPage };
