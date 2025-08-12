import type { JSONSchema7 } from 'json-schema';

export type AssistantUITools = Record<
  string,
  { description?: string; parameters: JSONSchema7 }
>;
