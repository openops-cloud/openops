import { AppLogo } from '@/app/common/components/app-logo';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  Button,
  cn,
  CommunityBadge,
  SideMenuHeader,
  TooltipWrapper,
} from '@openops/components/ui';
import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { PanelRight } from 'lucide-react';
import { useCallback } from 'react';

const DashboardSideMenuHeader = () => {
  const { isMinimized, setIsSidebarMinimized } = useAppStore((state) => ({
    isMinimized: state.isSidebarMinimized,
    setIsSidebarMinimized: state.setIsSidebarMinimized,
  }));

  const showCommunity = flagsHooks.useFlag(FlagId.SHOW_COMMUNITY)
    .data as boolean;

  const toggleSidebar = useCallback(() => {
    setIsSidebarMinimized(!isMinimized);
  }, [isMinimized, setIsSidebarMinimized]);

  const tooltipText = isMinimized ? t('Open sidebar') : t('Close sidebar');

  const showCommunityBadge = !isMinimized && showCommunity;

  return (
    <SideMenuHeader
      className={cn('justify-between gap-1 overflow-hidden px-4', {
        'justify-start pl-3 gap-0': isMinimized,
      })}
      logo={isMinimized ? null : <AppLogo className="h-6" />}
    >
      <div
        className={cn('flex-1 flex items-center justify-between', {
          'justify-end': !showCommunityBadge,
        })}
      >
        {showCommunityBadge && (
          <CommunityBadge
            showUpgrade={false}
            link={'https://www.openops.com/pricing/'}
          />
        )}

        <TooltipWrapper tooltipText={tooltipText} tooltipPlacement="right">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={tooltipText}
            className={cn({
              'mr-4': isMinimized,
            })}
          >
            <PanelRight
              className="animate-fade size-[18px]"
              strokeWidth="2.3"
            />
          </Button>
        </TooltipWrapper>
      </div>
    </SideMenuHeader>
  );
};

DashboardSideMenuHeader.displayName = 'DashboardSideMenuHeader';
export { DashboardSideMenuHeader };
