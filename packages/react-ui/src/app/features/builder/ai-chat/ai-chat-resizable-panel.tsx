import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { cn, ResizableHandle, ResizablePanel } from '@openops/components/ui';
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

  const [showChatDelayed, setShowChatDelayed] = useState(false);

  const { getPanelSize } = useResizablePanelGroup();

  const showChat = useMemo(() => {
    return !!hasActiveAiSettings && !!isAiChatOpened && !isLoading;
  }, [hasActiveAiSettings, isAiChatOpened, isLoading]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowChatDelayed(showChat);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [showChat]);

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
          'min-w-[300px]': showChat && showChatDelayed,
        })}
        minSize={15}
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
