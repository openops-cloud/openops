/* eslint-disable react/prop-types */
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import {
  RESIZABLE_PANEL_GROUP,
  RESIZABLE_PANEL_IDS,
} from '@/app/constants/layout';
import {
  LEFT_SIDEBAR_MAX_SIZE,
  LEFT_SIDEBAR_MIN_SIZE,
} from '@/app/constants/sidebar';
import { useAppStore } from '@/app/store/app-store';
import { cn } from '@openops/components/ui';
import {
  ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { ImperativePanelHandle } from 'react-resizable-panels';

interface ResizablePanelProps
  extends ComponentProps<typeof ResizablePrimitive.Panel> {
  className?: string;
}

export type LeftSidebarResizablePanelProps = ResizablePanelProps & {
  isDragging: boolean;
};

const LeftSidebarResizablePanel: React.FC<LeftSidebarResizablePanelProps> = ({
  className = '',
  isDragging,
  ...props
}) => {
  const sidebarRef = useRef<ImperativePanelHandle | null>(null);
  const { getPanelGroupSize } = useResizablePanelGroup();

  const getExpandedPanelSizeFromLocalStorage = useCallback((): number => {
    const panelGroupSize = getPanelGroupSize(RESIZABLE_PANEL_GROUP);
    return panelGroupSize[0] || LEFT_SIDEBAR_MIN_SIZE;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expandedPanelSizeRef = useRef(getExpandedPanelSizeFromLocalStorage());

  const { isMinimized } = useAppStore((state) => ({
    isMinimized: state.isSidebarMinimized,
  }));

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!sidebarRef.current) {
      return;
    }
    try {
      if (isMinimized) {
        expandedPanelSizeRef.current = getExpandedPanelSizeFromLocalStorage();
        if (hasMounted) {
          sidebarRef.current?.collapse();
        }
      } else {
        sidebarRef.current?.expand(expandedPanelSizeRef.current);
      }
    } catch (err) {
      console.warn('Sidebar update skipped', err);
    }
  }, [getExpandedPanelSizeFromLocalStorage, hasMounted, isMinimized]);

  return (
    <ResizablePrimitive.Panel
      id={RESIZABLE_PANEL_IDS.LEFT_SIDEBAR}
      className={cn(className, {
        'transition-all duration-200 ease-in-out': !isDragging && hasMounted,
        'duration-0': !hasMounted,
      })}
      minSize={0}
      maxSize={LEFT_SIDEBAR_MAX_SIZE}
      order={1}
      collapsible={true}
      collapsedSize={LEFT_SIDEBAR_MIN_SIZE}
      ref={sidebarRef}
      defaultSize={expandedPanelSizeRef.current ?? LEFT_SIDEBAR_MIN_SIZE}
      {...props}
    />
  );
};

LeftSidebarResizablePanel.displayName = 'LeftSidebarResizablePanel';

export default LeftSidebarResizablePanel;
