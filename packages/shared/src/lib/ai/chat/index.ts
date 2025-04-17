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
        content: Type.String(),
      }),
    ),
  ),
});

export type OpenChatResponse = Static<typeof OpenChatResponse>;
