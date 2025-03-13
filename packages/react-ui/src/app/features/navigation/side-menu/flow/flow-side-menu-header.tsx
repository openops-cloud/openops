import { Button, SideMenuHeader, TooltipWrapper } from '@openops/components/ui';
import { PanelRight } from 'lucide-react';

import { AppLogo } from '@/app/common/components/app-logo';
import {
  LeftSideBarType,
  useBuilderStateContext,
} from '@/app/features/builder/builder-hooks';
import { useAppStore } from '@/app/store/app-store';
import { t } from 'i18next';
import { useCallback } from 'react';

const FlowSideMenuHeader = () => {
  const [setLeftSidebar] = useBuilderStateContext((state) => [
    state.setLeftSidebar,
  ]);

  const { setIsSidebarMinimized } = useAppStore((state) => ({
    setIsSidebarMinimized: state.setIsSidebarMinimized,
  }));

  const closeSidebar = useCallback(() => {
    setLeftSidebar(LeftSideBarType.NONE);
    setIsSidebarMinimized(true);
  }, [setIsSidebarMinimized, setLeftSidebar]);

  return (
    <SideMenuHeader
      className="h-[52px] justify-between pr-0"
      logo={<AppLogo className="h-6" />}
    >
      <TooltipWrapper
        tooltipText={t('Close sidebar')}
        tooltipPlacement="bottom"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={closeSidebar}
          aria-label="Toggle Sidebar"
        >
          <PanelRight className="size-6" />
        </Button>
      </TooltipWrapper>
    </SideMenuHeader>
  );
};

FlowSideMenuHeader.displayName = 'FlowSideMenuHeader';
export { FlowSideMenuHeader };
