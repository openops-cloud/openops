import { Static, Type } from '@sinclair/typebox';

export const BlockContext = Type.Object({
  chatId: Type.Optional(Type.String()),
  workflowId: Type.Optional(Type.String()),
  blockName: Type.Optional(Type.String()),
  stepId: Type.Optional(Type.String()),
  actionName: Type.Optional(Type.String()),
});

export const OpenChatMCPRequest = BlockContext;
export type OpenChatMCPRequest = Static<typeof OpenChatMCPRequest>;

export const OpenChatResponse = Type.Object({
  chatId: Type.String(),
  provider: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  messages: Type.Optional(
    Type.Array(
      Type.Object({
        role: Type.String(),
        parts: Type.Union([
          Type.String(),
          Type.Array(
            Type.Object({
              type: Type.Literal('text'),
              text: Type.String(),
            }),
          ),
        ]),
      }),
    ),
  ),
});

export type OpenChatResponse = Static<typeof OpenChatResponse>;

export const VariableContext = Type.Object({
  name: Type.String(),
  value: Type.Any(),
});
export type VariableContext = Static<typeof VariableContext>;

export const StepContext = Type.Object({
  id: Type.String(),
  stepDisplayName: Type.String(),
  stepIndex: Type.Optional(Type.Number()),
  variables: Type.Optional(Type.Array(VariableContext)),
});
export type StepContext = Static<typeof StepContext>;

export const ChatFlowContext = Type.Object({
  flowId: Type.String(),
  flowVersionId: Type.String(),
  runId: Type.Optional(Type.String()),
  currentStepId: Type.Optional(Type.String()),
  currentStepDisplayName: Type.Optional(Type.String()),
  currentStepIndex: Type.Optional(Type.Number()),
  currentStepData: Type.Optional(Type.Any()),
  steps: Type.Array(StepContext),
});

export type ChatFlowContext = Static<typeof ChatFlowContext>;

export const NewMessageRequest = Type.Object({
  chatId: Type.String(),
  message: Type.Union([
    Type.String({}),
    Type.Object({
      role: Type.Union([
        Type.Literal('user'),
        Type.Literal('assistant'),
        Type.Literal('tool'),
      ]),
      parts: Type.Any(),
    }),
  ]),
  additionalContext: Type.Optional(ChatFlowContext),
  tools: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export type NewMessageRequest = Static<typeof NewMessageRequest>;

export const ChatNameRequest = Type.Object({
  chatId: Type.String(),
});
export type ChatNameRequest = Static<typeof ChatNameRequest>;

export const RenameChatRequest = Type.Object({
  chatId: Type.String(),
});

export type RenameChatRequest = Static<typeof RenameChatRequest>;

export const RenameChatRequestBody = Type.Object({
  chatName: Type.String({
    minLength: 1,
    maxLength: 100,
  }),
});
export type RenameChatRequestBody = Static<typeof RenameChatRequestBody>;

export const ChatsSummary = Type.Object({
  chatId: Type.String(),
  chatName: Type.String(),
});

export const ListChatsResponse = Type.Object({
  chats: Type.Array(ChatsSummary),
});

export type ListChatsResponse = Static<typeof ListChatsResponse>;

export const DeleteChatHistoryRequest = Type.Object({
  chatId: Type.String(),
});

export type DeleteChatHistoryRequest = Static<typeof DeleteChatHistoryRequest>;

export const UpdateChatModelRequest = Type.Object({
  chatId: Type.String(),
  model: Type.String(),
});

export type UpdateChatModelRequest = Static<typeof UpdateChatModelRequest>;

export const UpdateChatModelResponse = Type.Object({
  chatId: Type.String(),
  model: Type.String(),
  provider: Type.String(),
});

export type UpdateChatModelResponse = Static<typeof UpdateChatModelResponse>;

export * from './code-output-structure';
