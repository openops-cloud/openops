import type { JSONSchema7 } from 'json-schema';

export type AssistantUITools = Record<
  string,
  { description?: string; parameters: JSONSchema7 }
>;

export enum QueryClassification {
  analytics = 'analytics',
  tables = 'tables',
  openops = 'openops',
  aws_cost = 'aws_cost',
  general = 'general',
}

export type QueryTypes =
  | QueryClassification.analytics
  | QueryClassification.tables
  | QueryClassification.openops
  | QueryClassification.aws_cost
  | QueryClassification.general;
