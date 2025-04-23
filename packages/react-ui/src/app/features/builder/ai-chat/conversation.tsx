import { LoadingSpinner } from '@openops/components/ui';
import { flowHelper, FlowVersion } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { aiChatApi } from './lib/chat-api';

type ConversationProps = {
  stepName: string;
  flowVersion: FlowVersion;
};

const Conversation = ({ flowVersion, stepName }: ConversationProps) => {
  const stepDetails = flowHelper.getStep(flowVersion, stepName);
  const blockName = stepDetails?.settings?.blockName;

  const { isPending, data } = useQuery({
    queryKey: ['openChat', flowVersion.flowId, blockName, stepName],
    queryFn: async () => {
      if (!stepDetails) {
        throw new Error('Step not found');
      }
      return aiChatApi.open(flowVersion.flowId, blockName, stepName);
    },
    enabled: !!stepDetails && !!stepDetails.settings.blockName,
    staleTime: Infinity,
  });

  if (isPending) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="truncate">ChatId: {data?.chatId}</span>
      {data?.messages?.map((message) => (
        <div key={message.role}>
          <span>{message.role}</span>
          <span>{message.content}</span>
        </div>
      ))}
      {!data?.messages?.length && <span>No messages yet</span>}
    </div>
  );
};
Conversation.displayName = 'Conversation';
export { Conversation };
