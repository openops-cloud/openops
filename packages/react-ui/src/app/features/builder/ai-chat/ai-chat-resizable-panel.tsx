import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { cn, ResizableHandle, ResizablePanel } from '@openops/components/ui';
import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';

const AiChatResizablePanelContent = ({
  showChat,
  onCloseButtonClick,
}: {
  showChat: boolean;
  onCloseButtonClick: () => void;
}) => {
  if (!showChat) return null;

  return (
    <div className="w-full h-full flex bg-secondary">
      <AssistantUiChat onClose={onCloseButtonClick} title={t('AI Assistant')} />
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
  const showChatInResizablePanel = flagsHooks.useFlag<boolean>(
    FlagId.ASSISTANT_UI_ENABLED,
  ).data;

  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const resizablePanelRef = useRef<ImperativePanelHandle | null>(null);

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { getPanelSize } = useResizablePanelGroup();

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

  const getDefaultPanelSize = useCallback(() => {
    if (!showChat) return 0;
    return getPanelSize(RESIZABLE_PANEL_IDS.AI_CHAT) ?? 20;
  }, [getPanelSize, showChat]);

  useEffect(() => {
    if (!resizablePanelRef.current) {
      return;
    }
    if (showChat) {
      resizablePanelRef.current?.expand(getDefaultPanelSize());
    } else {
      resizablePanelRef.current?.collapse();
    }
  }, [getDefaultPanelSize, showChat]);

  return (
    <>
      <ResizablePanel
        ref={resizablePanelRef}
        order={2}
        id={RESIZABLE_PANEL_IDS.AI_CHAT}
        className={cn('duration-0 min-w-0 shadow-sidebar z-20', {
          'min-w-[350px]': showChat,
          'transition-width transition-[min-width] duration-300':
            !isDraggingHandle && hasMounted,
        })}
        minSize={0}
        collapsible={true}
        defaultSize={getDefaultPanelSize()}
      >
        <AiChatResizablePanelContent
          showChat={showChat}
          onCloseButtonClick={() => setIsAiChatOpened(false)}
        />
      </ResizablePanel>
      <ResizableHandle
        className={cn('w-0')}
        onDragging={onDragging}
        disabled={!showChat}
      />
    </>
  );
};

AiChatResizablePanel.displayName = 'AiChatResizablePanel';
export { AiChatResizablePanel };
