import {
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@openops/components/ui';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AllowOnlyLoggedInUserOnlyGuard } from '@/app/common/guards/allow-logged-in-user-only-guard';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import {
  LEFT_SIDEBAR_MAX_SIZE,
  LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
  LEFT_SIDEBAR_MIN_SIZE,
} from '@/app/constants/sidebar';
import { AiConfigurationPrompt } from '@/app/features/ai/ai-configuration-prompt';
import { AiChatResizablePanel } from '@/app/features/ai/assistant/ai-chat-resizable-panel';
import { useAppStore } from '@/app/store/app-store';
import { DashboardSideMenu } from '../side-menu/dashboard/dashboard-side-menu';
import LeftSidebarResizablePanel from '../side-menu/left-sidebar';

// todo -> move to constants
const SIDEBAR_MIN_SIZE = 18;
const SIDEBAR_MINIMIZED_WIDTH = 10;

const MINIMIZED_NAVIGATION_ROUTES = [
  '/flows/',
  '/templates/',
  '/tables',
  '/analytics',
];

const UNAUTHENTHICATED_ROUTES = [
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

  const isUnauthenticatedRoute = UNAUTHENTHICATED_ROUTES.some(
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
    <AllowOnlyLoggedInUserOnlyGuard>
      <div className="h-screen w-screen overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          id="page-container"
          onLayout={onResize}
          className="h-full"
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
            className="flex-1 h-full overflow-hidden"
            // todo constants
            defaultSize={70}
            minSize={50}
            style={{
              minWidth: '900px',
            }}
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
  );
}
