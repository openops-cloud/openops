import { useTheme } from '@/app/common/providers/theme-provider';
import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  ChatStatus,
  LoadingSpinner,
  MarkdownCodeVariations,
  tryParseJson,
} from '@openops/components/ui';
import { CodeLLMSchema, OpenChatResponse, SourceCode } from '@openops/shared';
import { useCallback, useMemo } from 'react';
import { useBuilderStateContext } from '../builder-hooks';

type ConversationProps = {
  isPending: boolean;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef: React.RefObject<HTMLDivElement>;
} & Pick<UseChatHelpers, 'messages' | 'status'>;

type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
type MessageType = ServerMessage | UIMessage;

const StepSettingsAiConversation = ({
  messages,
  status,
  isPending,
  lastUserMessageRef,
  lastAssistantMessageRef,
}: ConversationProps) => {
  const { theme } = useTheme();
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);

  const onInject = useCallback(
    (code: string | SourceCode) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  const uiMessages: AIChatMessage[] = useMemo(() => {
    return messages.map((message: MessageType, idx) => {
      if (
        message.role.toLowerCase() === AIChatMessageRole.assistant &&
        isCodeMessage(message)
      ) {
        const codeSchema = message.annotations?.find(
          (annotation: any): annotation is CodeLLMSchema =>
            typeof annotation === 'object' &&
            annotation !== null &&
            'code' in annotation &&
            'description' in annotation,
        );

        if (codeSchema) {
          return createCodeMessage(message, idx, codeSchema);
        }

        // when loading data from the history it's serialized as string
        const parsed = tryParseJson(message.content) as CodeLLMSchema;
        if (parsed?.code && parsed?.description) {
          return createCodeMessage(message, idx, parsed);
        }
      }
      return createMessage(message, idx);
    });
  }, [messages]);

  if (isPending) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-2 max-w-full">
      <AIChatMessages
        messages={uiMessages}
        onInject={onInject}
        codeVariation={MarkdownCodeVariations.WithCopyAndInject}
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        theme={theme}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(
        status as ChatStatus,
      ) && <LoadingSpinner />}
    </div>
  );
};

const isCodeMessage = (
  message: MessageType,
): message is UIMessage & { annotations: CodeLLMSchema[] } =>
  ('annotations' in message &&
    !!message?.annotations?.length &&
    message.annotations?.some(
      (annotation) =>
        typeof annotation === 'object' &&
        annotation !== null &&
        'code' in annotation &&
        'description' in annotation,
    )) ||
  (typeof message.content === 'string' &&
    (tryParseJson(message.content) as CodeLLMSchema)?.code !== undefined);

const getMessageId = (message: MessageType, idx: number): string => {
  return message && 'id' in message ? message.id : String(idx);
};

const createCodeMessage = (
  message: MessageType,
  idx: number,
  parsed: CodeLLMSchema,
): AIChatMessage => {
  return {
    id: getMessageId(message, idx),
    role: AIChatMessageRole.assistant,
    content: {
      parts: [
        {
          type: 'sourcecode',
          content: parsed,
        },
        {
          type: 'text',
          content: parsed.description,
        },
      ],
    },
  };
};

const createMessage = (message: MessageType, idx: number): AIChatMessage => {
  return {
    id: getMessageId(message, idx),
    role:
      message.role.toLowerCase() === 'user'
        ? AIChatMessageRole.user
        : AIChatMessageRole.assistant,
    content: Array.isArray(message.content)
      ? message.content.map((c) => c.text).join()
      : message.content,
  };
};

StepSettingsAiConversation.displayName = 'StepSettingsAiConversation';
export { StepSettingsAiConversation };
