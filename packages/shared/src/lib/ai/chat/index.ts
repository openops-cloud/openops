import { Static, Type } from '@sinclair/typebox';

export const OpenChatRequest = Type.Object({
  workflowId: Type.String(),
  blockName: Type.String(),
  stepName: Type.String(),
});

export type OpenChatRequest = Static<typeof OpenChatRequest>;

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
