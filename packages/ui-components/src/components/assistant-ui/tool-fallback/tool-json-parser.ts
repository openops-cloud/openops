import { TextContentPart } from '@assistant-ui/react';
import { tryParseJson } from '../../../lib/json-utils';

type ContentStructure = {
  content: TextContentPart[];
};

/**
 * Checks if a value has the structure: { content: [{ type: "text", text: "..." }] }
 * Used to identify content structures that can be parsed for JSON extraction.
 */
export function isContentStructure(value: unknown): value is ContentStructure {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  try {
    if (!('content' in obj) || !Array.isArray(obj.content)) {
      return false;
    }

    return obj.content.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string',
    );
  } catch {
    return false;
  }
}

/**
 * Extracts and returns object content from TextContentPart array.
 * Returns parsed objects when possible, otherwise returns the original content.
 *
 * @param content - Array of TextContentPart objects to extract from
 * @returns Parsed object if JSON is found, otherwise original text or formatted content
 */
export function extractJsonFromContent(
  content: TextContentPart[],
): string | object {
  if (!Array.isArray(content) || content.length === 0) {
    return '';
  }

  if (content.length === 1) {
    try {
      const item = content[0];
      if (
        !item ||
        typeof item !== 'object' ||
        !('text' in item) ||
        typeof item.text !== 'string'
      ) {
        return content;
      }

      const text = item.text;
      const parsed = tryParseJson(text);

      if (parsed !== text && typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }

      return text;
    } catch {
      return content;
    }
  }

  // Fail-safe: for multiple content items, safely stringify
  try {
    return content;
  } catch {
    return 'Unable to process content';
  }
}

/**
 * Main function to format result data for display in CodeEditor.
 * Returns parsed objects when possible, maintaining object structure for better display.
 * Handles various data structures and provides fail-safe fallbacks.
 *
 * @param result - The data to format for display
 * @returns Parsed object if possible, otherwise formatted string or original data
 */
export function formatToolResultForDisplay(result: unknown): string | object {
  if (result === null || result === undefined) {
    return String(result);
  }

  if (typeof result === 'string') {
    try {
      const parsed = tryParseJson(result);
      if (parsed !== result && typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
      return result;
    } catch {
      return result;
    }
  }

  if (typeof result !== 'object') {
    return result;
  }

  if (isContentStructure(result)) {
    return extractJsonFromContent(result.content);
  }

  return result;
}
