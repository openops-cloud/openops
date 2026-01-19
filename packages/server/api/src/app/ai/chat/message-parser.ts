import { isNil, NewMessageRequest } from '@openops/shared';

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
  const lastContentElement = message.parts.at(-1);

  if (
    !firstContentElement ||
    typeof firstContentElement !== 'object' ||
    (!('text' in firstContentElement) &&
      !lastContentElement?.type.includes('tool-ui'))
  ) {
    return {
      isValid: false,
      errorMessage:
        'Message must have either a text element as the first part or a tool-ui element as the last part.',
    };
  }

  const content =
    firstContentElement.type !== 'reasoning' && !isNil(firstContentElement.text)
      ? String(firstContentElement.text)
      : 'continue';

  return {
    isValid: true,
    content,
  };
}
