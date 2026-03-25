import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import {
  SETTINGS_KEYS,
  userSettingsHooks,
} from '@/app/common/hooks/user-settings-hooks';
import { OPENOPS_CONNECT_TEMPLATES_URL } from '@/app/constants/cloud';
import { popupFeatures } from '@/app/features/cloud/lib/popup';
import { useUserInfoPolling } from '@/app/features/cloud/lib/use-user-info-polling';
import { flowsHooks } from '@/app/features/flows/lib/flows-hooks';
import { templatesHooks } from '@/app/features/templates/lib/templates-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useAppStore } from '@/app/store/app-store';
import {
  DismissiblePanel,
  ExploreTemplates,
  ExploreTemplatesCarousel,
  FinOpsBenchmarkBanner,
  FlowTemplateMetadataWithIntegrations,
  NoWorkflowsPlaceholder,
} from '@openops/components/ui';
import { Permission } from '@openops/shared';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShowTemplatesBanner } from '../../templates/hooks/use-show-templates-banner';
import { useOpenBenchmarkWizard } from './use-open-benchmark-wizard';
import { useBenchmarkBannerState } from './useBenchmarkBannerState';

type HomeOnboardingViewProps = {
  isHelpViewClosed: boolean;
  onExploreTemplatesClick: () => void;
  onTemplateClick: (template: FlowTemplateMetadataWithIntegrations) => void;
};

const HomeOnboardingView = ({
  isHelpViewClosed,
  onExploreTemplatesClick,
  onTemplateClick,
}: HomeOnboardingViewProps) => {
  const navigate = useNavigate();
  const { createPollingInterval } = useUserInfoPolling();

  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const { templatesWithIntegrations, refetch } =
    templatesHooks.useTemplatesMetadataWithIntegrations({
      enabled: true,
      useCloudTemplates: true,
      domains: selectedDomains,
      gettingStartedTemplateFilter: 'exclude',
    });
  const { domains } = templatesHooks.useTemplateFilters({
    enabled: true,
    useCloudTemplates: true,
    gettingStartedTemplateFilter: 'exclude',
  });
  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  const { isHomeCloudConnectionClosed } = useAppStore((state) => ({
    isHomeCloudConnectionClosed: state.userSettings.isHomeCloudConnectionClosed,
  }));

  const { isCloudUser } = useShowTemplatesBanner();

  const { checkAccess } = useAuthorization();
  const hasBenchmarkPermissions =
    checkAccess(Permission.WRITE_FLOW) &&
    checkAccess(Permission.READ_APP_CONNECTION);

  const { mutate: createFlow } = flowsHooks.useCreateFlow(navigate);
  const openBenchmarkWizard = useOpenBenchmarkWizard();

  useEffect(() => {
    setSelectedDomains([]);
    setTimeout(() => {
      refetch({ cancelRefetch: true });
    }, 1000);
  }, [isCloudUser, refetch, setSelectedDomains]);

  const onExploreMoreClick = () => {
    const currentUser = authenticationSession.getCurrentUser();
    const popup = window.open(
      `${OPENOPS_CONNECT_TEMPLATES_URL}?projectId=${currentUser?.projectId}&userId=${currentUser?.id}`,
      'ConnectTemplates',
      popupFeatures,
    );

    if (!popup) {
      console.error(
        'Popup blocked! Could not load ' + OPENOPS_CONNECT_TEMPLATES_URL,
      );
    }

    createPollingInterval();
  };

  const onTemplatesFilterClick = (filter: string) => {
    setSelectedDomains(filter ? [filter] : []);
  };

  const closeCloudConnectionBlock = () => {
    updateUserSettings({ [SETTINGS_KEYS.isHomeCloudConnectionClosed]: true });
  };

  const {
    isEnabled: isFinOpsBenchmarkEnabled,
    variation: benchmarkVariation,
    providers: benchmarkProviders,
  } = useBenchmarkBannerState();
  const onViewBenchmarkReportClick = (provider: string) =>
    navigate(`/analytics?dashboard=${provider}_benchmark`);

  return (
    <div className="flex flex-col gap-6 flex-1">
      {isFinOpsBenchmarkEnabled && (
        <FinOpsBenchmarkBanner
          variation={benchmarkVariation}
          providers={benchmarkProviders}
          onActionClick={openBenchmarkWizard}
          onViewReportClick={onViewBenchmarkReportClick}
          disabled={!hasBenchmarkPermissions}
        />
      )}
      <ExploreTemplatesCarousel
        onSeeAllClick={onExploreTemplatesClick}
        onFilterClick={onTemplatesFilterClick}
        templates={templatesWithIntegrations}
        showFilters={isCloudUser}
        filters={domains}
        onTemplateClick={onTemplateClick}
      />
      {!isCloudUser && !isHomeCloudConnectionClosed && (
        <DismissiblePanel
          className="h-fit"
          buttonClassName="z-50 size-6"
          closeTooltip={t('Close')}
          onClose={closeCloudConnectionBlock}
        >
          <ExploreTemplates
            onExploreMoreClick={onExploreMoreClick}
            className="max-w-none max-h-[234px] h-[234px]"
          />
        </DismissiblePanel>
      )}
      {(isHelpViewClosed || isCloudUser || isHomeCloudConnectionClosed) && (
        <div className="flex-1 border rounded-sm overflow-hidden min-h-[120px]">
          <NoWorkflowsPlaceholder
            onExploreTemplatesClick={onExploreTemplatesClick}
            onNewWorkflowClick={
              checkAccess(Permission.WRITE_FLOW)
                ? () => {
                    createFlow(undefined);
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
};

HomeOnboardingView.displayName = 'HomeOnboardingView';
export { HomeOnboardingView };
