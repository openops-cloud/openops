import { AIChatMessage, isNil } from '@openops/shared';

export type ParsedMessage = {
  content: string;
  isValid: true;
};

export type InvalidMessage = {
  isValid: false;
  errorMessage: string;
};

export type MessageParseResult = ParsedMessage | InvalidMessage;

export const UI_TOOL_RESULT_SUBMISSION_MESSAGE = '[ui-tool-result-submission]';

export function parseUserMessage(message: AIChatMessage): MessageParseResult {
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
      : UI_TOOL_RESULT_SUBMISSION_MESSAGE;

  return {
    isValid: true,
    content,
  };
}
