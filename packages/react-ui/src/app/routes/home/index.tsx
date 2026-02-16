import {
  SETTINGS_KEYS,
  userSettingsHooks,
} from '@/app/common/hooks/user-settings-hooks';
import { HomeGetStarted } from '@/app/features/home/components/home-get-started';
import { HomeOnboardingView } from '@/app/features/home/components/home-onboarding-view';
import { HomeOperationalView } from '@/app/features/home/components/home-operational-view';
import { SelectFlowTemplateDialog } from '@/app/features/templates/components/select-flow-template-dialog';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  cn,
  FlowTemplateMetadataWithIntegrations,
} from '@openops/components/ui';
import { useState } from 'react';

const HomePage = () => {
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] =
    useState<boolean>(false);

  const [selectedTemplate, setSelectedTemplate] = useState<
    FlowTemplateMetadataWithIntegrations | undefined
  >(undefined);

  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  const { isHelpViewClosed, isOperationalViewEnabled } = useAppStore(
    (state) => ({
      isHelpViewClosed: state.userSettings.isHelpViewClosed,
      isOperationalViewEnabled: state.userSettings.isOperationalViewEnabled,
    }),
  );

  const { templatesWithIntegrations: getStartedTemplates } =
    templatesHooks.useTemplatesMetadataWithIntegrations({
      enabled: !isHelpViewClosed,
      useCloudTemplates: true,
      gettingStartedTemplateFilter: 'only',
    });

  const closeGetStartedBlock = () => {
    updateUserSettings({ [SETTINGS_KEYS.isHelpViewClosed]: true });
  };

  const onExploreTemplatesClick = () => {
    setIsTemplatesDialogOpen(true);
  };

  const onTemplateClick = (template: FlowTemplateMetadataWithIntegrations) => {
    setIsTemplatesDialogOpen(true);
    setSelectedTemplate(template);
  };

  const onExploreTemplatesClose = () => {
    setSelectedTemplate(undefined);
    setIsTemplatesDialogOpen(false);
  };

  return (
    <>
      <div
        className={cn('flex-col w-full @container contain-layout', {
          'h-fit': isOperationalViewEnabled || !isHelpViewClosed,
        })}
      >
        <div className="h-full flex flex-col gap-4 px-7 pb-4">
          {!isHelpViewClosed && (
            <HomeGetStarted
              close={closeGetStartedBlock}
              sampleTemplates={getStartedTemplates}
              onSampleTemplateClick={onTemplateClick}
            />
          )}
          {isOperationalViewEnabled ? (
            <HomeOperationalView
              onExploreTemplatesClick={onExploreTemplatesClick}
            />
          ) : (
            <HomeOnboardingView
              isHelpViewClosed={isHelpViewClosed}
              onExploreTemplatesClick={onExploreTemplatesClick}
              onTemplateClick={onTemplateClick}
            />
          )}
        </div>
      </div>

      <SelectFlowTemplateDialog
        isOpen={isTemplatesDialogOpen}
        onOpenChange={onExploreTemplatesClose}
        preselectedSelectedTemplateMetadata={selectedTemplate}
      />
    </>
  );
};

HomePage.displayName = 'HomePage';
export { HomePage };
