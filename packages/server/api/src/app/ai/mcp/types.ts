import { ToolSet } from 'ai';
import type { JSONSchema7 } from 'json-schema';

export type MCPTool = {
  client: unknown;
  toolSet: ToolSet;
};

export type AssistantUITools = Record<
  string,
  { description?: string; parameters: JSONSchema7 }
>;

export const QueryClassification = {
  analytics: 'analytics',
  tables: 'tables',
  openops: 'openops',
  aws_cost: 'aws_cost',
  general: 'general',
} as const;

export type QueryClassification =
  (typeof QueryClassification)[keyof typeof QueryClassification];
