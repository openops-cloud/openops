import { AiAssistantConversation } from '@/app/features/ai/ai-assistant-conversation';
import { useAiAssistantChat } from '@/app/features/ai/lib/ai-assistant-chat-hook';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useSafeBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { flowsHooks } from '@/app/features/flows/lib/flows-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatContainer,
  AiAssistantChatSizeState,
  AiScopeItem,
  AiScopeType,
  CHAT_MIN_WIDTH,
  cn,
  NoAiEnabledPopover,
  PARENT_INITIAL_HEIGHT_GAP,
  PARENT_MAX_HEIGHT_GAP,
  ScopeOption,
} from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type AiAssistantChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  className?: string;
};

const CHAT_MAX_WIDTH = 600;
const CHAT_EXPANDED_WIDTH_OFFSET = 32;
const CHAT_WIDTH_FACTOR = 0.3;

const AiAssistantChat = ({
  middlePanelSize,
  className,
}: AiAssistantChatProps) => {
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const {
    isAiChatOpened,
    setIsAiChatOpened,
    aiChatSize,
    setAiChatSize,
    aiChatDimensions,
    setAiChatDimensions,
  } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
    aiChatSize: s.aiChatSize,
    setAiChatSize: s.setAiChatSize,
    aiChatDimensions: s.aiChatDimensions,
    setAiChatDimensions: s.setAiChatDimensions,
  }));

  const [aiScopeItems, setAiScopeItems] = useState<AiScopeItem[]>([]);
  const [availableScopeOptions, setAvailableScopeOptions] = useState<
    ScopeOption[]
  >([]);

  const flowVersion = useSafeBuilderStateContext((s) => s?.flowVersion);

  useEffect(() => {
    const options = flowVersion?.trigger
      ? flowHelper.getAllSteps(flowVersion.trigger)
      : [];

    setAvailableScopeOptions((state) => {
      const newOptions = options
        .filter((option) => Boolean(option.id))
        .map((option) => {
          return {
            id: option.id,
            displayName: option.displayName,
            type: AiScopeType.STEP,
          } as ScopeOption;
        });

      // Create a map of existing options by ID for quick lookup
      const existingOptionsMap = new Map(
        state.map((option) => [option.id, option]),
      );

      // Only add new options that don't already exist in the state
      newOptions.forEach((option) => {
        if (!existingOptionsMap.has(option.id)) {
          existingOptionsMap.set(option.id, option);
        }
      });

      return Array.from(existingOptionsMap.values());
    });
  }, [flowVersion]);

  const { data: workflows } = flowsHooks.useFlows({
    limit: 999,
    cursor: undefined,
  });

  useEffect(() => {
    if (workflows) {
      setAvailableScopeOptions((options) => {
        const newOptions = workflows.data.map((workflow) => {
          return {
            id: workflow.id,
            displayName: workflow.version.displayName,
            type: AiScopeType.WORKFLOW,
          };
        });

        // Create a map of existing options by ID for quick lookup
        const existingOptionsMap = new Map(
          options.map((option) => [option.id, option]),
        );

        // Only add new options that don't already exist in the state
        newOptions.forEach((option) => {
          if (!existingOptionsMap.has(option.id)) {
            existingOptionsMap.set(option.id, option);
          }
        });

        return Array.from(existingOptionsMap.values());
      });
    }
  }, [workflows]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    createNewChat,
    isOpenAiChatPending,
  } = useAiAssistantChat();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const sizes = useMemo(() => {
    const calculatedWidth = middlePanelSize.width * CHAT_WIDTH_FACTOR;
    const calculatedExpandedWidth =
      middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET;

    const calculatedHeight =
      middlePanelSize.height -
      (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
        ? PARENT_MAX_HEIGHT_GAP
        : PARENT_INITIAL_HEIGHT_GAP);

    return {
      current: aiChatDimensions ?? {
        width: Math.max(
          CHAT_MIN_WIDTH,
          aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
            ? calculatedExpandedWidth
            : Math.min(calculatedWidth, CHAT_MAX_WIDTH),
        ),
        height: calculatedHeight,
      },
      max: {
        width: middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET,
        height: middlePanelSize.height - PARENT_MAX_HEIGHT_GAP,
      },
    };
  }, [
    aiChatDimensions,
    aiChatSize,
    middlePanelSize.height,
    middlePanelSize.width,
  ]);

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const onToggleAiChatState = useCallback(() => {
    let newSize: AiAssistantChatSizeState;
    if (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
      newSize = AI_CHAT_CONTAINER_SIZES.DOCKED;
    } else {
      newSize = AI_CHAT_CONTAINER_SIZES.EXPANDED;
    }
    setAiChatSize(newSize);
  }, [aiChatSize, setAiChatSize]);

  const handleScopeSelected = useCallback((scope: ScopeOption) => {
    // Check if the scope is already in the aiScopeItems
    setAiScopeItems((prevItems) => {
      const isAlreadyAdded = prevItems.some((item) => item.id === scope.id);
      if (!isAlreadyAdded) {
        return [...prevItems, scope as AiScopeItem];
      }
      return prevItems;
    });
  }, []);

  const handleScopeRemoved = useCallback((id: string) => {
    setAiScopeItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  // Filter out already selected items from available options
  const filteredAvailableScopeOptions = useMemo(() => {
    const selectedIds = new Set(aiScopeItems.map((item) => item.id));
    return availableScopeOptions.filter(
      (option) => !selectedIds.has(option.id),
    );
  }, [availableScopeOptions, aiScopeItems]);

  if (isLoading) {
    return null;
  }

  if (!hasActiveAiSettings && isAiChatOpened) {
    return (
      <NoAiEnabledPopover
        className={cn('absolute left-4 bottom-[17px] z-50', className)}
        onCloseClick={() => setIsAiChatOpened(false)}
      />
    );
  }

  return (
    <AiAssistantChatContainer
      dimensions={sizes.current}
      setDimensions={setAiChatDimensions}
      maxSize={sizes.max}
      showAiChat={isAiChatOpened}
      onCloseClick={() => setIsAiChatOpened(false)}
      className={cn('left-4 bottom-[17px]', className)}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
      isEmpty={!messages?.length}
      onCreateNewChatClick={createNewChat}
      toggleAiChatState={onToggleAiChatState}
      aiChatSize={aiChatSize}
      availableModels={availableModels}
      selectedModel={selectedModel}
      isModelSelectorLoading={isModelSelectorLoading}
      onModelSelected={onModelSelected}
      messages={messages.map((m, idx) => ({
        id: m.id ?? String(idx),
        role: m.role,
      }))}
      status={status}
      lastUserMessageRef={lastUserMessageRef}
      lastAssistantMessageRef={lastAssistantMessageRef}
      aiScopeItems={aiScopeItems}
      onAiScopeItemRemove={handleScopeRemoved}
      availableScopeOptions={filteredAvailableScopeOptions}
      onScopeSelected={handleScopeSelected}
    >
      <AiAssistantConversation
        messages={messages}
        status={status}
        isPending={isOpenAiChatPending}
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
      />
    </AiAssistantChatContainer>
  );
};

AiAssistantChat.displayName = 'AiAssistantChat';
export { AiAssistantChat };
