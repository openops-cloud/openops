import {
  cn,
  HelpUsImprove,
  ScrollArea,
  SideMenu,
  SideMenuNavigation,
} from '@openops/components/ui';
import { useLocation } from 'react-router-dom';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { FolderFilterList } from '@/app/features/folders/component/folder-filter-list';
import { useAnalyticsLinks } from '@/app/features/navigation/lib/analytics-links-hook';
import { useMenuLinks } from '@/app/features/navigation/lib/menu-links-hook';
import { DashboardSideMenuHeader } from '@/app/features/navigation/side-menu/dashboard/dashboard-side-menu-header';
import { SideMenuFooter } from '@/app/features/navigation/side-menu/side-menu-footer';
import { NavTop } from '@/app/features/workspaces/components/nav-top';
import { usersApi } from '@/app/lib/users-api';
import { isValidISODate } from '@/app/lib/utils';
import { useAppStore } from '@/app/store/app-store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function DashboardSideMenu() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isWorkflowsPage = location.pathname.includes('flows');
  const isAnalyticsPage = location.pathname.includes('analytics');
  const isSidebarMinimized = useAppStore((state) => state.isSidebarMinimized);

  const userSettings = useAppStore((state) => state.userSettings);
  const { refetch: refetchUserSettings, isLoading: isUserSettingsLoading } =
    userSettingsHooks.useUserSettings();

  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  const onAccept = useCallback(async () => {
    await updateUserSettings({
      telemetryInteractionTimestamp: new Date().toISOString(),
    });
    await usersApi.setTelemetry({ ...userSettings, trackEvents: true });
    queryClient.invalidateQueries({
      queryKey: [QueryKeys.userMetadata],
    });
    refetchUserSettings();
  }, [updateUserSettings, userSettings, queryClient, refetchUserSettings]);

  const onDismiss = useCallback(async () => {
    await updateUserSettings({
      telemetryInteractionTimestamp: new Date().toISOString(),
    });
    refetchUserSettings();
  }, [updateUserSettings, refetchUserSettings]);

  const showBanner =
    !isSidebarMinimized &&
    !isUserSettingsLoading &&
    userSettings !== undefined &&
    !isValidISODate(userSettings?.telemetryInteractionTimestamp || '');

  const analyticsMenuLinks = useAnalyticsLinks();
  const menuLinks = useMenuLinks();

  return (
    <SideMenu
      MenuHeader={<DashboardSideMenuHeader />}
      MenuFooter={<SideMenuFooter isMinimized={isSidebarMinimized} />}
    >
      <SideMenuNavigation
        links={menuLinks}
        isMinimized={isSidebarMinimized}
        NavTop={<NavTop isSidebarMinimized={isSidebarMinimized} />}
      />
      <div className="flex flex-col justify-between h-full overflow-hidden">
        {isWorkflowsPage && !isSidebarMinimized && (
          <ScrollArea className="border-t">
            <FolderFilterList />
          </ScrollArea>
        )}
        {isAnalyticsPage && (
          <SideMenuNavigation
            links={analyticsMenuLinks}
            isMinimized={isSidebarMinimized}
          />
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
