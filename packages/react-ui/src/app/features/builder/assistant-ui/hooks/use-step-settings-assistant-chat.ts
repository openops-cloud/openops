import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { ChatMode } from '@/app/features/ai/lib/types';
import { FlowVersion, SourceCode } from '@openops/shared';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';

export const useStepSettingsAssistantChat = (
  flowVersion: FlowVersion,
  selectedStep: string,
) => {
  const { dispatch, builderState } = useBuilderStateContext((state) => ({
    dispatch: state.applyMidpanelAction,
    builderState: {
      flowId: state.flow.id,
      flowVersionId: state.flowVersion.id,
      runId: state.run?.id,
      selectedStep: state.selectedStep,
      showSettingsAIChat: state.midpanelState.showAiChat,
    },
  }));
  const [chatSessionKey, setChatSessionKey] = useState<string>(nanoid());

  const onChatIdChange = useCallback((id: string | null) => {
    setChatSessionKey(id ?? nanoid());
  }, []);

  useEffect(() => {
    setChatSessionKey(nanoid());
  }, [selectedStep]);

  const onInject = useCallback(
    (code: string | SourceCode) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  const assistantChat = useAssistantChat({
    chatId: chatSessionKey,
    onChatIdChange,
    chatMode: ChatMode.StepSettings,
    context: builderState,
  });

  return {
    ...assistantChat,
    onInject,
    flowVersion,
  };
};
