import {
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
} from '@openops/components/ui';
import React, { useState } from 'react';

import { DashboardSideMenu } from '@/app/features/navigation/side-menu/dashboard/dashboard-side-menu';

import { AllowOnlyLoggedInUserOnlyGuard } from '@/app/common/guards/allow-logged-in-user-only-guard';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { PanelSizes } from '@/app/common/types/panel-sizes';
import { useAppStore } from '@/app/store/app-store';
import {
  RESIZABLE_PANEL_GROUP,
  RESIZABLE_PANEL_IDS,
} from '../../constants/layout';
import {
  LEFT_SIDEBAR_MAX_SIZE,
  LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
  LEFT_SIDEBAR_MIN_SIZE,
} from '../../constants/sidebar';
import LeftSidebarResizablePanel from './side-menu/left-sidebar';

type DashboardContainerProps = {
  children: React.ReactNode;
  pageHeader?: React.ReactNode;
  useEntireInnerViewport?: boolean;
};

const SIDEBAR_MIN_SIZE = 18;
const SIDEBAR_MINIMIZED_WIDTH = 10;

export function DashboardContainer({
  children,
  pageHeader,
  useEntireInnerViewport,
}: DashboardContainerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const { isMinimized } = useAppStore((state) => ({
    isMinimized: state.isSidebarMinimized,
  }));

  const { setPanelGroupSize } = useResizablePanelGroup();

  return (
    <AllowOnlyLoggedInUserOnlyGuard>
      <ResizablePanelGroup
        direction="horizontal"
        id="dashboard"
        onLayout={(size) => {
          setPanelGroupSize(RESIZABLE_PANEL_GROUP, size as PanelSizes);
        }}
      >
        <LeftSidebarResizablePanel
          minSize={isMinimized ? SIDEBAR_MINIMIZED_WIDTH : SIDEBAR_MIN_SIZE}
          maxSize={
            isMinimized ? SIDEBAR_MINIMIZED_WIDTH : LEFT_SIDEBAR_MAX_SIZE
          }
          collapsedSize={
            isMinimized ? SIDEBAR_MINIMIZED_WIDTH : LEFT_SIDEBAR_MIN_SIZE
          }
          isDragging={isDragging}
          className={cn(
            LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
            'shadow-sidebar z-10',
            {
              'min-w-[70px] max-w-[70px]': isMinimized,
            },
          )}
        >
          <DashboardSideMenu />
        </LeftSidebarResizablePanel>

        <ResizableHandle
          className="bg-transparent"
          disabled={isMinimized}
          onDragging={setIsDragging}
          style={{
            width: '0px',
          }}
        />

        <ResizablePanel
          id={RESIZABLE_PANEL_IDS.MAIN}
          order={2}
          className="flex-1"
        >
          <DashboardContent
            pageHeader={pageHeader}
            useEntireInnerViewport={useEntireInnerViewport}
          >
            {children}
          </DashboardContent>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AllowOnlyLoggedInUserOnlyGuard>
  );
}

const DashboardContent = React.memo(function Content({
  children,
  pageHeader,
  useEntireInnerViewport,
}: {
  children: React.ReactNode;
  pageHeader: React.ReactNode;
  useEntireInnerViewport?: boolean;
}) {
  return (
    <div className={cn('flex flex-col flex-1 p-0 h-screen')}>
      {pageHeader}
      <ScrollArea className="h-full flex flex-1">
        <div
          className={cn('container flex w-full max-w-full h-full px-0 py-4', {
            'p-0': useEntireInnerViewport,
          })}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  );
});
