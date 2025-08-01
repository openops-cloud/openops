import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { FlowVersion, SourceCode } from '@openops/shared';
import { useCallback } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';

export const useStepSettingsAssistantChat = (
  flowVersion: FlowVersion,
  selectedStep: string,
) => {
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);

  const onInject = useCallback(
    (code: string | SourceCode) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  const assistantChat = useAssistantChat({
    flowVersion,
    selectedStep,
  });

  return {
    ...assistantChat,
    onInject,
    flowVersion,
    selectedStep,
  };
};
