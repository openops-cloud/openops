import { SourceCode } from '@openops/shared';
import {
  AIChatMessage,
  AIChatMessageContent,
  AIChatMessageRole,
} from './types';

// Extract the structured content type for easier use
type StructuredContentParts = Extract<
  AIChatMessageContent,
  { type: 'structured' }
>['parts'];

/**
 * Creates a structured message with multiple parts (text, code, sourcecode)
 */
export const createStructuredMessage = (
  id: string,
  role: keyof typeof AIChatMessageRole,
  parts: StructuredContentParts,
): AIChatMessage => ({
  id,
  role,
  content: {
    type: 'structured',
    parts,
  },
});

/**
 * Creates a message with a single SourceCode object
 */
export const createSourceCodeMessage = (
  id: string,
  role: keyof typeof AIChatMessageRole,
  sourceCode: SourceCode,
  description?: string,
): AIChatMessage => {
  const parts: StructuredContentParts = [];

  if (description) {
    parts.push({
      type: 'text',
      content: description,
    });
  }

  parts.push({
    type: 'sourcecode',
    content: sourceCode,
  });

  return createStructuredMessage(id, role, parts);
};

/**
 * Creates a simple text message (for backward compatibility)
 */
export const createTextMessage = (
  id: string,
  role: keyof typeof AIChatMessageRole,
  content: string,
): AIChatMessage => ({
  id,
  role,
  content,
});

/**
 * Creates a message with mixed content types
 */
export const createMixedMessage = (
  id: string,
  role: keyof typeof AIChatMessageRole,
  textContent: string,
  codeBlocks: { content: string; language?: string }[] = [],
  sourceCodeBlocks: SourceCode[] = [],
): AIChatMessage => {
  const parts: StructuredContentParts = [
    {
      type: 'text',
      content: textContent,
    },
  ];

  // Add code blocks
  codeBlocks.forEach((codeBlock) => {
    parts.push({
      type: 'code',
      content: codeBlock.content,
      language: codeBlock.language,
    });
  });

  // Add source code blocks
  sourceCodeBlocks.forEach((sourceCode) => {
    parts.push({
      type: 'sourcecode',
      content: sourceCode,
    });
  });

  return createStructuredMessage(id, role, parts);
};
