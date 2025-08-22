/**
 * Utility functions for parsing and enhancing JSON content display in tool fallback components
 */

import { TextContentPart } from '@assistant-ui/react';
import { tryParseJson } from '../../../lib/json-utils';

type ContentStructure = {
  content: TextContentPart[];
};

/**
 * Checks if a value has the structure: { content: [{ type: "text", text: "..." }] }
 */
export function isContentStructure(value: unknown): value is ContentStructure {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!('content' in obj) || !Array.isArray(obj.content)) {
    return false;
  }

  // Check if all items in content array have the expected structure
  return obj.content.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      'type' in item &&
      item.type === 'text' &&
      'text' in item &&
      typeof item.text === 'string',
  );
}

/**
 * Extracts and parses JSON from content structure if possible
 * Returns a properly formatted JSON string for display
 */
export function extractJsonFromContent(content: TextContentPart[]): string {
  if (content.length === 0) {
    return '';
  }

  // If there's only one text content, try to parse it as JSON
  if (content.length === 1) {
    const text = content[0].text;
    const parsed = tryParseJson(text);

    // If parsing succeeded and it's an object, return formatted JSON
    if (parsed !== text && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }

    // Otherwise return the original text
    return text;
  }

  // If parsing failed, return a formatted representation of the content array
  return JSON.stringify(content, null, 2);
}

/**
 * Main function to format result data for display in CodeEditor
 * Handles various data structures and attempts to provide the best display format
 */
export function formatToolResultForDisplay(result: unknown): string {
  if (result === null || result === undefined) {
    return String(result);
  }

  if (typeof result === 'string') {
    const parsed = tryParseJson(result);
    if (parsed !== result && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
    return result;
  }

  if (typeof result !== 'object') {
    return String(result);
  }

  if (isContentStructure(result)) {
    return extractJsonFromContent(result.content);
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}
