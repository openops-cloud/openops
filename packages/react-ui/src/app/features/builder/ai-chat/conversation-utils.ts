import { UIMessage } from '@ai-sdk/ui-utils';
import {
  AIChatMessage,
  AIChatMessageRole,
  tryParseJson,
} from '@openops/components/ui';
import { CodeSchema, OpenChatResponse } from '@openops/shared';

export type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
export type MessageType = ServerMessage | UIMessage;

const findInAnnotations = <T>(
  message: UIMessage,
  predicate: (annotation: unknown) => annotation is T,
): T | undefined => {
  return message.annotations?.find(predicate) as T;
};

const checkStringContent = (
  content: string,
  predicate: (obj: unknown) => boolean,
): boolean => {
  const parsed = tryParseJson(content);
  return predicate(parsed);
};

const checkArrayContent = (
  content: any[],
  predicate: (obj: unknown) => boolean,
): boolean => {
  return content.some((item) => {
    if (isTextItem(item)) {
      return checkStringContent(item.text, predicate);
    }
    return false;
  });
};

export const isCodeMessage = (message: MessageType): message is UIMessage => {
  if (hasAnnotations(message)) {
    return message.annotations?.some(isCodeSchema) ?? false;
  }

  if (typeof message.content === 'string') {
    return checkStringContent(message.content, isCodeSchema);
  }

  if (Array.isArray(message.content)) {
    return checkArrayContent(message.content, isCodeSchema);
  }

  return false;
};

export const extractCodeFromContent = (
  message: MessageType,
): CodeSchema | null => {
  if (hasAnnotations(message)) {
    const annotationCode = findInAnnotations(message, isCodeSchema);
    if (annotationCode) return annotationCode;
  }

  if (Array.isArray(message.content)) {
    for (const item of message.content) {
      if (isTextItem(item)) {
        const codeSchema = parseAndCheckSchema(item.text, isCodeSchema);
        if (codeSchema) return codeSchema;
      }
    }
  }

  return null;
};

export const getMessageId = (message: MessageType, idx: number): string => {
  return message && 'id' in message ? message.id : String(idx);
};

export const createCodeMessage = (
  message: MessageType,
  idx: number,
  parsed: CodeSchema,
): AIChatMessage => {
  if (parsed.type !== 'code') {
    return createMessage(message, idx);
  }

  return {
    id: getMessageId(message, idx),
    role: AIChatMessageRole.assistant,
    content: {
      parts: [
        {
          type: 'sourcecode',
          content: {
            code: parsed.code,
            packageJson: parsed.packageJson,
          },
        },
        {
          type: 'text',
          content: parsed.textAnswer,
        },
      ],
    },
  };
};

const extractTextFromContent = (content: any): string => {
  if (Array.isArray(content) && content.length > 0) {
    const firstItem = content[0];
    if (isTextItem(firstItem)) {
      const replyMessage = parseAndCheckSchema(firstItem.text, isReplyMessage);
      if (replyMessage) return replyMessage.textAnswer;
    }
  } else if (typeof content === 'string') {
    const replyMessage = parseAndCheckSchema(content, isReplyMessage);
    if (replyMessage) return replyMessage.textAnswer;
  }
  return content;
};

const formatArrayContent = (content: any[]): string => {
  return content
    .map((c) => (typeof c === 'object' && 'text' in c ? c.text : c))
    .join();
};

export const createMessage = (
  message: MessageType,
  idx: number,
): AIChatMessage => {
  const content = extractTextFromContent(message.content);

  return {
    id: getMessageId(message, idx),
    role:
      message.role.toLowerCase() === 'user'
        ? AIChatMessageRole.user
        : AIChatMessageRole.assistant,
    content: Array.isArray(content) ? formatArrayContent(content) : content,
  };
};

const hasAnnotations = (message: MessageType): message is UIMessage => {
  return (
    'annotations' in message &&
    Array.isArray(message.annotations) &&
    message.annotations.length > 0
  );
};

const isTextItem = (item: any): item is { type: 'text'; text: string } => {
  return item.type === 'text' && typeof item.text === 'string';
};

const parseAndCheckSchema = <T>(
  text: string,
  predicate: (obj: unknown) => obj is T,
): T | null => {
  const parsed = tryParseJson(text);
  return predicate(parsed) ? parsed : null;
};

const isCodeSchema = (obj: unknown): obj is CodeSchema => {
  return (obj as CodeSchema)?.type === 'code';
};

const isReplyMessage = (
  obj: unknown,
): obj is { type: 'reply'; textAnswer: string } => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'reply' &&
    'textAnswer' in obj &&
    typeof obj.textAnswer === 'string'
  );
};
