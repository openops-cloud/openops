import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { BlockProperty } from '@openops/blocks-framework';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  LoadingSpinner,
} from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
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
      );
      onConversationRetrieved(data);
      return data;
    },
    enabled: !!stepDetails && !!stepDetails.settings.blockName,
  });

  const messagesToDisplay: MessageType[] =
    messages.length > 0 ? messages : data?.messages ?? [];

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
        onInject={(code) => {
          // tbd in next ticket
          // eslint-disable-next-line no-console
          console.log('inject', code);
        }}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

Conversation.displayName = 'Conversation';
export { Conversation };
