import {
  cn,
  HelpUsImprove,
  ScrollArea,
  SideMenu,
  SideMenuNavigation,
} from '@openops/components/ui';
import { useLocation } from 'react-router-dom';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { MENU_LINKS } from '@/app/constants/menu-links';
import { FolderFilterList } from '@/app/features/folders/component/folder-filter-list';
import { DashboardSideMenuHeader } from '@/app/features/navigation/side-menu/dashboard/dashboard-side-menu-header';
import { SideMenuFooter } from '@/app/features/navigation/side-menu/side-menu-footer';
import { isValidISODate } from '@/app/lib/utils';
import { useAppStore } from '@/app/store/app-store';

export function DashboardSideMenu() {
  const location = useLocation();
  const isWorkflowsPage = location.pathname.includes('flows');
  const isSidebarMinimized = useAppStore((state) => state.isSidebarMinimized);

  const userSettings = useAppStore((state) => state.userSettings);
  const { refetch: refetchUserSettings, isLoading: isUserSettingsLoading } =
    userSettingsHooks.useUserSettings();

  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  const onAccept = async () => {
    updateUserSettings({
      telemetryBannerInteractionTimestamp: new Date().toISOString(),
    });

    refetchUserSettings();
  };

  const onDismiss = () => {
    updateUserSettings({
      telemetryBannerInteractionTimestamp: new Date().toISOString(),
    });
    refetchUserSettings();
  };

  const showBanner =
    !isSidebarMinimized &&
    !isUserSettingsLoading &&
    userSettings !== undefined &&
    !isValidISODate(userSettings?.telemetryBannerInteractionTimestamp || '');

  return (
    <SideMenu MenuHeader={DashboardSideMenuHeader} MenuFooter={SideMenuFooter}>
      <SideMenuNavigation links={MENU_LINKS} isMinimized={isSidebarMinimized} />
      {isWorkflowsPage && !isSidebarMinimized && (
        <ScrollArea className="border-t">
          <FolderFilterList />
        </ScrollArea>
      )}
      {showBanner && (
        <div
          className={cn('p-4 flex flex-col justify-end', {
            'h-full': !isWorkflowsPage,
          })}
        >
          <HelpUsImprove onAccept={onAccept} onDismiss={onDismiss} />
        </div>
      )}
    </SideMenu>
  );
}
