import { Static, Type } from '@sinclair/typebox';

export const OpenChatRequest = Type.Object({
  workflowId: Type.String(),
  blockName: Type.String(),
  stepName: Type.String(),
  actionName: Type.String(),
});
export type OpenChatRequest = Static<typeof OpenChatRequest>;

export const OpenChatMCPRequest = Type.Object({
  chatId: Type.Optional(Type.String()),
  workflowId: Type.Optional(Type.String()),
  blockName: Type.Optional(Type.String()),
  stepName: Type.Optional(Type.String()),
  actionName: Type.Optional(Type.String()),
});
export type OpenChatMCPRequest = Static<typeof OpenChatMCPRequest>;

export const OpenChatResponse = Type.Object({
  chatId: Type.String(),
  messages: Type.Optional(
    Type.Array(
      Type.Object({
        role: Type.String(),
        content: Type.Union([
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

export const NewMessageRequest = Type.Object({
  chatId: Type.String(),
  message: Type.String(),
});

export type NewMessageRequest = Static<typeof NewMessageRequest>;

export const DeleteChatHistoryRequest = Type.Object({
  chatId: Type.String(),
});

export type DeleteChatHistoryRequest = Static<typeof DeleteChatHistoryRequest>;

export const GetAllChatsResponse = Type.Object({
  chats: Type.Array(
    Type.Object({
      chatId: Type.String(),
      context: Type.Union([
        Type.Object({
          workflowId: Type.Optional(Type.String()),
          blockName: Type.Optional(Type.String()),
          stepName: Type.Optional(Type.String()),
          actionName: Type.Optional(Type.String()),
          chatId: Type.Optional(Type.String()),
        }),
        Type.Null(),
      ]),
    }),
  ),
});

export type GetAllChatsResponse = Static<typeof GetAllChatsResponse>;
