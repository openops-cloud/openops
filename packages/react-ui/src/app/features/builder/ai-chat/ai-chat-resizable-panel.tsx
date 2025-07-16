import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import {
  RESIZABLE_PANEL_GROUP,
  RESIZABLE_PANEL_IDS,
} from '@/app/constants/layout';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { cn, ResizableHandle, ResizablePanel } from '@openops/components/ui';
import { FlagId } from '@openops/shared';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';

const AiChatResizablePanelContent = ({ showChat }: { showChat: boolean }) => {
  if (!showChat) return null;
  return (
    <div className="w-full h-full flex p-1 pr-2 bg-secondary">
      <div className="h-full flex-1 bg-red-500 ">ChatPlaceholder</div>
    </div>
  );
};

type AiChatResizablePanelProps = {
  isDraggingHandle: boolean;
  onDragging: (onDragging: boolean) => void;
};

const AiChatResizablePanel = ({
  isDraggingHandle,
  onDragging,
}: AiChatResizablePanelProps) => {
  const showChatInResizablePanel = flagsHooks.useFlag<string>(
    FlagId.SHOW_CHAT_IN_RESIZABLE_PANEL,
  ).data;

  const { isAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
  }));

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const resiablePanelRef = useRef<ImperativePanelHandle | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [hasMounted, setHasMounted] = useState(false);

  const { getPanelGroupSize } = useResizablePanelGroup();

  const getAiChatPanelSizeFromLocalStorage = useCallback((): number => {
    const panelGroupSize = getPanelGroupSize(RESIZABLE_PANEL_GROUP);
    return panelGroupSize[1] ?? 20;
  }, [getPanelGroupSize]);

  const aiChatPanelSizeRef = useRef(getAiChatPanelSizeFromLocalStorage());

  const showChat = useMemo(() => {
    return (
      !!showChatInResizablePanel &&
      !!hasActiveAiSettings &&
      !!isAiChatOpened &&
      !isLoading
    );
  }, [
    hasActiveAiSettings,
    isAiChatOpened,
    isLoading,
    showChatInResizablePanel,
  ]);

  useEffect(() => {
    if (!resiablePanelRef.current) {
      return;
    }
    if (showChat) {
      resiablePanelRef.current?.expand();
    } else {
      resiablePanelRef.current?.collapse();
    }
  }, [showChat]);

  return (
    <>
      <ResizablePanel
        ref={resiablePanelRef}
        order={2}
        id={RESIZABLE_PANEL_IDS.AI_CHAT}
        minSize={0}
        maxSize={40}
        collapsible={true}
        className={cn('duration-0 min-w-0 ', {
          'min-w-[350px]': showChat,
          'transition-all duration-200 ease-in-out':
            !isDraggingHandle && hasMounted,
        })}
        defaultSize={aiChatPanelSizeRef.current}
      >
        <AiChatResizablePanelContent showChat={showChat} />
      </ResizablePanel>
      <ResizableHandle className="w-0" onDragging={onDragging} />
    </>
  );
};

AiChatResizablePanel.displayName = 'AiChatResizablePanel';
export { AiChatResizablePanel };
