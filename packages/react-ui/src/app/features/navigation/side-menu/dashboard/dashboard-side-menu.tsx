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
import { usersApi } from '@/app/lib/users-api';
import { isValidISODate } from '@/app/lib/utils';
import { useAppStore } from '@/app/store/app-store';
import { useCallback } from 'react';

export function DashboardSideMenu() {
  const location = useLocation();
  const isWorkflowsPage = location.pathname.includes('flows');
  const isSidebarMinimized = useAppStore((state) => state.isSidebarMinimized);

  const userSettings = useAppStore((state) => state.userSettings);
  const { refetch: refetchUserSettings, isLoading: isUserSettingsLoading } =
    userSettingsHooks.useUserSettings();

  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  const onAccept = useCallback(async () => {
    await updateUserSettings({
      telemetryBannerInteractionTimestamp: new Date().toISOString(),
    });
    await usersApi.setTelemetry({ ...userSettings, trackEvents: true });
    refetchUserSettings();
  }, [updateUserSettings, refetchUserSettings, userSettings]);

  const onDismiss = useCallback(async () => {
    await updateUserSettings({
      telemetryBannerInteractionTimestamp: new Date().toISOString(),
    });
    refetchUserSettings();
  }, [updateUserSettings, refetchUserSettings]);

  const showBanner =
    !isSidebarMinimized &&
    !isUserSettingsLoading &&
    userSettings !== undefined &&
    !isValidISODate(userSettings?.telemetryBannerInteractionTimestamp || '');

  return (
    <SideMenu MenuHeader={DashboardSideMenuHeader} MenuFooter={SideMenuFooter}>
      <SideMenuNavigation links={MENU_LINKS} isMinimized={isSidebarMinimized} />
      <div className="flex flex-col justify-between h-full overflow-hidden">
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
      </div>
    </SideMenu>
  );
}
