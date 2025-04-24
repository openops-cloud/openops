import { BlockProperty } from '@openops/blocks-framework';
import { LoadingSpinner } from '@openops/components/ui';
import { flowHelper, FlowVersion } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { aiChatApi } from './lib/chat-api';

type ConversationProps = {
  stepName: string;
  flowVersion: FlowVersion;
  property: BlockProperty;
};

const Conversation = ({
  flowVersion,
  stepName,
  property,
}: ConversationProps) => {
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
  });

  if (isPending) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-2">
      <span>Context Property name: {property.displayName}</span>
      <span className="truncate">ChatId: {data?.chatId}</span>
      {data?.messages?.map((message) => (
        <div className="w-full flex flex-col truncate" key={message.role}>
          <span className="uppercase font-semibold">{message.role}:</span>
          <span className="truncate">{JSON.stringify(message.content)}</span>
        </div>
      ))}
      {!data?.messages?.length && <span>No messages yet</span>}
    </div>
  );
};
Conversation.displayName = 'Conversation';
export { Conversation };
