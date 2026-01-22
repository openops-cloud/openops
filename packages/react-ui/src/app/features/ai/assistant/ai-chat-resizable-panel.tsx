import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import AssistantUiChat from '@/app/features/ai/assistant/assistant-ui-chat';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { cn, ResizableHandle, ResizablePanel } from '@openops/components/ui';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';

type AiChatResizablePanelProps = {
  onDragging: (onDragging: boolean) => void;
};

const AiChatResizablePanel = ({ onDragging }: AiChatResizablePanelProps) => {
  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const resizablePanelRef = useRef<ImperativePanelHandle | null>(null);

  const { getPanelSize } = useResizablePanelGroup();

  const showChat = useMemo(() => {
    return !!hasActiveAiSettings && !!isAiChatOpened && !isLoading;
  }, [hasActiveAiSettings, isAiChatOpened, isLoading]);

  const getDefaultPanelSize = useCallback(() => {
    if (!showChat) return 0;
    return getPanelSize(RESIZABLE_PANEL_IDS.AI_CHAT) ?? 20;
  }, [getPanelSize, showChat]);

  const prevShowChatRef = useRef(showChat);

  useEffect(() => {
    if (!resizablePanelRef.current) {
      return;
    }

    if (prevShowChatRef.current !== showChat) {
      if (showChat) {
        const savedSize = getPanelSize(RESIZABLE_PANEL_IDS.AI_CHAT) ?? 20;
        resizablePanelRef.current?.expand(savedSize);
      } else {
        resizablePanelRef.current?.collapse();
      }
      prevShowChatRef.current = showChat;
    }
  }, [showChat, getPanelSize]);

  const size = getSize(hasActiveAiSettings, isAiChatOpened);

  return (
    <>
      <ResizablePanel
        ref={resizablePanelRef}
        order={2}
        id={RESIZABLE_PANEL_IDS.AI_CHAT}
        className={cn('duration-0 min-w-0 shadow-sidebar', {
          'min-w-[300px] max-w-[500px] z-[11]': showChat,
        })}
        minSize={size}
        maxSize={size}
        collapsible={true}
        collapsedSize={0}
        defaultSize={getDefaultPanelSize()}
      >
        <div className="w-full h-full flex bg-secondary overflow-hidden border-r">
          <AssistantUiChat
            title={t('OpenOps Assistant')}
            onClose={() => setIsAiChatOpened(false)}
          />
        </div>
      </ResizablePanel>
      {showChat && <ResizableHandle className="w-0" onDragging={onDragging} />}
    </>
  );
};

const getSize = (hasActiveAiSettings: boolean, isAiChatOpened: boolean) => {
  if (!hasActiveAiSettings) return 0;
  // defaults to min-max pixel sizes defined on the container
  if (isAiChatOpened) return undefined;
  return 0;
};

AiChatResizablePanel.displayName = 'AiChatResizablePanel';
export { AiChatResizablePanel };
