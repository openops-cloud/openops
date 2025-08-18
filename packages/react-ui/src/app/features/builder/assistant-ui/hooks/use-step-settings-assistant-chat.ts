import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { FlowVersion, SourceCode } from '@openops/shared';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';

export const useStepSettingsAssistantChat = (
  flowVersion: FlowVersion,
  selectedStep: string,
) => {
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);
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
    flowVersion,
    selectedStep,
    chatId: chatSessionKey,
    onChatIdChange,
  });

  return {
    ...assistantChat,
    onInject,
    flowVersion,
    selectedStep,
  };
};
