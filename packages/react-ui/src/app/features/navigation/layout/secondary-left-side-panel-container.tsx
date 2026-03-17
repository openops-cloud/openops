import { cn, ResizableHandle, ResizablePanel } from '@openops/components/ui';
import { Permission } from '@openops/shared';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import AssistantUiChat from '@/app/features/ai/assistant/assistant-ui-chat';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';

import { BenchmarkWizard } from '../../benchmark/components/benchmark-wizard';

interface SidePanelContainerProps {
  onDragging: (isDragging: boolean) => void;
}

const SecondaryLeftSidePanelContainer = ({
  onDragging,
}: SidePanelContainerProps) => {
  const {
    isBenchmarkWizardOpen,
    setIsBenchmarkWizardOpen,
    isAiChatOpened,
    setIsAiChatOpened,
    setIsSidebarMinimized,
  } = useAppStore((s) => ({
    isBenchmarkWizardOpen: s.isBenchmarkWizardOpen,
    setIsBenchmarkWizardOpen: s.setIsBenchmarkWizardOpen,
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
    setIsSidebarMinimized: s.setIsSidebarMinimized,
  }));

  const { checkAccess } = useAuthorization();
  const hasBenchmarkAccess =
    checkAccess(Permission.WRITE_FLOW) &&
    checkAccess(Permission.READ_APP_CONNECTION);

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const resizablePanelRef = useRef<ImperativePanelHandle | null>(null);
  const { getPanelSize } = useResizablePanelGroup();

  const shouldShowAiChat = useMemo(() => {
    return !!hasActiveAiSettings && !!isAiChatOpened && !isLoading;
  }, [hasActiveAiSettings, isAiChatOpened, isLoading]);

  const prevVisibilityRef = useRef({
    shouldShowBenchmark: hasBenchmarkAccess && isBenchmarkWizardOpen,
    shouldShowAiChat,
  });

  const shouldShowBenchmark = hasBenchmarkAccess && isBenchmarkWizardOpen;
  const shouldShowPanelContent = shouldShowBenchmark || shouldShowAiChat;

  const getDefaultPanelSize = useCallback(() => {
    if (!shouldShowPanelContent) return 0;
    return getPanelSize(RESIZABLE_PANEL_IDS.SECONDARY_LEFT_SIDEBAR) ?? 20;
  }, [getPanelSize, shouldShowPanelContent]);

  useEffect(() => {
    if (shouldShowBenchmark) {
      setIsSidebarMinimized(true);
    }
  }, [shouldShowBenchmark, setIsSidebarMinimized]);

  useEffect(() => {
    if (!resizablePanelRef.current) {
      return;
    }

    const shouldUpdatePanel = shouldUpdatePanelVisibility(
      prevVisibilityRef.current,
      shouldShowBenchmark,
      shouldShowAiChat,
    );

    if (!shouldUpdatePanel) {
      return;
    }

    if (shouldShowPanelContent) {
      expandPanel(resizablePanelRef.current, getPanelSize);
    } else {
      collapsePanel(resizablePanelRef.current);
    }

    prevVisibilityRef.current = {
      shouldShowBenchmark,
      shouldShowAiChat,
    };
  }, [
    shouldShowPanelContent,
    getPanelSize,
    shouldShowBenchmark,
    shouldShowAiChat,
  ]);

  const size = getSize(
    hasActiveAiSettings,
    isAiChatOpened,
    shouldShowBenchmark,
  );

  return (
    <>
      <ResizablePanel
        ref={resizablePanelRef}
        order={2}
        id={RESIZABLE_PANEL_IDS.SECONDARY_LEFT_SIDEBAR}
        className={cn('duration-0 shadow-sidebar max-w-[500px]', {
          'min-w-[300px] max-w-[500px] z-[11]': shouldShowPanelContent,
        })}
        minSize={size}
        maxSize={size}
        collapsible={true}
        collapsedSize={0}
        defaultSize={getDefaultPanelSize()}
      >
        {shouldShowBenchmark && (
          <div className="w-full h-full dark:bg-background">
            <BenchmarkWizard onClose={() => setIsBenchmarkWizardOpen(false)} />
          </div>
        )}
        {shouldShowAiChat && (
          <div className="w-full h-full flex bg-secondary overflow-hidden border-r">
            <AssistantUiChat
              title={t('OpenOps Assistant')}
              onClose={() => setIsAiChatOpened(false)}
            />
          </div>
        )}
      </ResizablePanel>
      {shouldShowPanelContent && (
        <ResizableHandle className="w-0" onDragging={onDragging} />
      )}
    </>
  );
};

const shouldUpdatePanelVisibility = (
  prevState: { shouldShowBenchmark: boolean; shouldShowAiChat: boolean },
  currentBenchmarkState: boolean,
  currentAiChatState: boolean,
): boolean => {
  return (
    prevState.shouldShowBenchmark !== currentBenchmarkState ||
    prevState.shouldShowAiChat !== currentAiChatState
  );
};

const expandPanel = (
  panelRef: ImperativePanelHandle,
  getPanelSize: (id: string) => number | undefined,
): void => {
  const savedSize =
    getPanelSize(RESIZABLE_PANEL_IDS.SECONDARY_LEFT_SIDEBAR) ?? 20;
  panelRef.expand(savedSize);
};

const collapsePanel = (panelRef: ImperativePanelHandle): void => {
  panelRef.collapse();
};

/**
 * Determines size constraint for the secondary panel.
 * @returns undefined = use default min/max pixel sizes defined on the container, 0 = collapsed
 */
const getSize = (
  hasActiveAiSettings: boolean,
  isAiChatOpened: boolean,
  isBenchmarkWizardOpen: boolean,
): number | undefined => {
  return isBenchmarkWizardOpen || (hasActiveAiSettings && isAiChatOpened)
    ? undefined
    : 0;
};

SecondaryLeftSidePanelContainer.displayName = 'SecondaryLeftSidePanelContainer';
export { SecondaryLeftSidePanelContainer };
