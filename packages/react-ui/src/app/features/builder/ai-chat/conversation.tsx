import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { BlockProperty } from '@openops/blocks-framework';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  LoadingSpinner,
  MarkdownCodeVariations,
} from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import { aiChatApi } from './lib/chat-api';

type ConversationProps = {
  stepName: string;
  flowVersion: FlowVersion;
  property: BlockProperty;
  onConversationRetrieved: (conversation: OpenChatResponse) => void;
} & Pick<UseChatHelpers, 'messages' | 'status'>;

type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
type MessageType = ServerMessage | UIMessage;

const ChatStatus = {
  STREAMING: 'streaming',
  SUBMITTED: 'submitted',
};

const Conversation = ({
  flowVersion,
  stepName,
  property,
  onConversationRetrieved,
  messages,
  status,
}: ConversationProps) => {
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);
  const stepDetails = flowHelper.getStep(flowVersion, stepName);
  const blockName = stepDetails?.settings?.blockName;

  const { isPending, data } = useQuery({
    queryKey: ['openChat', flowVersion.flowId, blockName, stepName],
    queryFn: async () => {
      if (!stepDetails) {
        throw new Error('Step not found');
      }

      const data = await aiChatApi.open(
        flowVersion.flowId,
        blockName,
        stepName,
        stepDetails.settings.actionName,
      );
      onConversationRetrieved(data);
      return data;
    },
    enabled:
      !!stepDetails &&
      !!stepDetails.settings.blockName &&
      !!stepDetails.settings.actionName,
  });

  const messagesToDisplay: MessageType[] =
    messages.length > 0 ? messages : data?.messages ?? [];

  const onInject = useCallback(
    (code: string) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  if (isPending) {
    return <LoadingSpinner />;
  }

  const uiMessages: AIChatMessage[] = messagesToDisplay.map(
    (message: MessageType, idx) => ({
      id: message && 'id' in message ? message.id : String(idx),
      role:
        message.role.toLowerCase() === 'user'
          ? AIChatMessageRole.user
          : AIChatMessageRole.assistant,
      content: Array.isArray(message.content)
        ? message.content.map((c) => c.text).join()
        : message.content,
    }),
  );

  return (
    <div className="flex flex-col gap-2">
      <AIChatMessages
        messages={uiMessages}
        onInject={onInject}
        codeVariation={MarkdownCodeVariations.WithCopyAndInject}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

Conversation.displayName = 'Conversation';
export { Conversation };
