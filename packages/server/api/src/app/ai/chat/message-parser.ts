import { NewMessageRequest } from '@openops/shared';

export type ParsedMessage = {
  content: string;
  isValid: true;
};

export type InvalidMessage = {
  isValid: false;
  errorMessage: string;
};

export type MessageParseResult = ParsedMessage | InvalidMessage;

export function parseUserMessage(
  message: NewMessageRequest['message'],
): MessageParseResult {
  if (typeof message === 'string') {
    return { isValid: true, content: message };
  }

  const firstContentElement = message.parts[0];
  const lastContentElement = message.parts[message.parts.length - 1];

  if (
    !firstContentElement ||
    typeof firstContentElement !== 'object' ||
    (!('text' in firstContentElement) &&
      !lastContentElement?.type.includes('tool-ui'))
  ) {
    return {
      isValid: false,
      errorMessage:
        'Last message must have a text content element as the first element.',
    };
  }

  return {
    isValid: true,
    content: String(firstContentElement.text ?? 'continue'),
  };
}
