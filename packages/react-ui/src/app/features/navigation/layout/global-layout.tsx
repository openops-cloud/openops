import {
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@openops/components/ui';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AllowOnlyLoggedInUserOnlyGuard } from '@/app/common/guards/allow-logged-in-user-only-guard';
import { FronteggAuthGuard } from '@/app/common/guards/frontegg-auth-guard';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import {
  GLOBAL_MAIN_PANEL_DEFAULT_SIZE,
  GLOBAL_MAIN_PANEL_MIN_SIZE,
  GLOBAL_SIDEBAR_MIN_SIZE,
  GLOBAL_SIDEBAR_MINIMIZED_WIDTH,
  LEFT_SIDEBAR_MAX_SIZE,
  LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
  LEFT_SIDEBAR_MIN_SIZE,
} from '@/app/constants/sidebar';
import { AiConfigurationPrompt } from '@/app/features/ai/ai-configuration-prompt';
import { AiChatResizablePanel } from '@/app/features/ai/assistant/ai-chat-resizable-panel';
import { useAppStore } from '@/app/store/app-store';
import { DashboardSideMenu } from '../side-menu/dashboard/dashboard-side-menu';
import LeftSidebarResizablePanel from '../side-menu/left-sidebar';

const MINIMIZED_NAVIGATION_ROUTES = [
  '/flows/',
  '/templates/',
  '/tables',
  '/analytics',
];

const UNAUTHENTICATED_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/forget-password',
  '/reset-password',
  '/verify-email',
  '/404',
  '/redirect',
  '/connect',
  '/oauth/callback',
  '/oauth/logout',
];

export function GlobalLayout() {
  const location = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(location.pathname);

  const { isMinimized, setIsSidebarMinimized } = useAppStore((state) => ({
    isMinimized: state.isSidebarMinimized,
    setIsSidebarMinimized: state.setIsSidebarMinimized,
  }));

  const { setPanelsSize } = useResizablePanelGroup();

  const isUnauthenticatedRoute = UNAUTHENTICATED_ROUTES.some(
    (route) =>
      location.pathname.startsWith(route) &&
      !location.pathname.startsWith('/connections'),
  );

  useEffect(() => {
    if (previousPathname === location.pathname) {
      return;
    }

    const shouldMinimize = MINIMIZED_NAVIGATION_ROUTES.some((route) =>
      location.pathname.startsWith(route),
    );

    const wasPreviouslyMinimizedRoute = MINIMIZED_NAVIGATION_ROUTES.some(
      (route) => previousPathname.startsWith(route),
    );

    if (shouldMinimize && !wasPreviouslyMinimizedRoute) {
      setIsSidebarMinimized(true);
    }

    setPreviousPathname(location.pathname);
  }, [location.pathname, previousPathname, setIsSidebarMinimized]);

  const onResize = useCallback(
    (size: number[]) => {
      setPanelsSize({
        [RESIZABLE_PANEL_IDS.LEFT_SIDEBAR]: size[0],
        [RESIZABLE_PANEL_IDS.AI_CHAT]: size[1],
      });
    },
    [setPanelsSize],
  );

  if (isUnauthenticatedRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <FronteggAuthGuard>
      <AllowOnlyLoggedInUserOnlyGuard>
        <div className="h-screen w-screen overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            id="page-container"
            onLayout={onResize}
            className="h-full"
          >
            <LeftSidebarResizablePanel
              minSize={
                isMinimized
                  ? GLOBAL_SIDEBAR_MINIMIZED_WIDTH
                  : GLOBAL_SIDEBAR_MIN_SIZE
              }
              maxSize={
                isMinimized
                  ? GLOBAL_SIDEBAR_MINIMIZED_WIDTH
                  : LEFT_SIDEBAR_MAX_SIZE
              }
              collapsedSize={
                isMinimized
                  ? GLOBAL_SIDEBAR_MINIMIZED_WIDTH
                  : LEFT_SIDEBAR_MIN_SIZE
              }
              isDragging={isDragging}
              className={cn(
                LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
                'shadow-sidebar z-[12]',
                {
                  'min-w-[70px] max-w-[70px]': isMinimized,
                },
                {
                  'max-w-[400px]': !isMinimized,
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

            <AiChatResizablePanel onDragging={setIsDragging} />

            <ResizablePanel
              id={RESIZABLE_PANEL_IDS.MAIN}
              order={3}
              className="flex-1 h-full overflow-hidden min-w-[900px] contain-layout"
              defaultSize={GLOBAL_MAIN_PANEL_DEFAULT_SIZE}
              minSize={GLOBAL_MAIN_PANEL_MIN_SIZE}
            >
              <div className="relative h-full w-full">
                <AiConfigurationPrompt
                  className={cn({
                    'bottom-[60px]':
                      location.pathname.startsWith('/flows/') ||
                      location.pathname.startsWith('/runs/'),
                  })}
                />
                <Outlet />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </AllowOnlyLoggedInUserOnlyGuard>
    </FronteggAuthGuard>
  );
}
