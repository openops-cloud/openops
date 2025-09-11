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
        className={cn('duration-0 min-w-0 shadow-sidebar', {
          'min-w-[300px] max-w-[400px] border-r border-outline': showChat,
        })}
        // todo constant
        minSize={isAiChatOpened ? undefined : 15}
        maxSize={isAiChatOpened ? undefined : 0}
        collapsible={true}
        defaultSize={getDefaultPanelSize()}
      >
        <div className="w-full h-full flex bg-secondary overflow-hidden">
          <AssistantUiChat
            title={t('AI Assistant')}
            onClose={() => setIsAiChatOpened(false)}
          />
        </div>
      </ResizablePanel>
      {showChat && (
        <ResizableHandle className={cn('w-0')} onDragging={onDragging} />
      )}
    </>
  );
};

AiChatResizablePanel.displayName = 'AiChatResizablePanel';
export { AiChatResizablePanel };
