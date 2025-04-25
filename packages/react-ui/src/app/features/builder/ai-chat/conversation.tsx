import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { BlockProperty } from '@openops/blocks-framework';
import { LoadingSpinner } from '@openops/components/ui';
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

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm italic">
        Context Property name: &quot;{property.displayName}&quot;
      </span>
      <span className="truncate text-sm italic">
        ChatId: &quot;{data?.chatId}&quot;
      </span>
      {messagesToDisplay.map((message: MessageType, idx) => (
        <div
          className="w-full flex flex-col"
          key={message && 'id' in message ? message.id : String(idx)}
        >
          <span className="uppercase font-semibold">{message.role}:</span>
          <span className="whitespace-pre-line break-words">
            {JSON.stringify(message.content)}
          </span>
        </div>
      ))}
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

Conversation.displayName = 'Conversation';
export { Conversation };
