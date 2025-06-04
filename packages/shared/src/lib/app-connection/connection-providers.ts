import { Type } from '@sinclair/typebox';

export enum Provider {
  AWS = 'AWS',
  AZURE = 'AZURE',
  DATABRICKS = 'DATABRICKS',
  GITHUB = 'GITHUB',
  GCLOUD = 'GCLOUD',
  JIRA = 'JIRA',
  MICROSOFT_TEAMS = 'MICROSOFT_TEAMS',
  MONDAY = 'MONDAY',
  SLACK = 'SLACK',
  SFTP = 'SFTP',
  SMTP = 'SMTP',
  SNOWFLAKE = 'SNOWFLAKE',
  TERNARY = 'TERNARY',
  UMBRELLA = 'UMBRELLA',
}

export const ConnectionProviderSchema = Type.Object({
  logoUrl: Type.String(),
  displayName: Type.String(),
  id: Type.Enum(Provider),
});

export type ConnectionProvider = {
  id: Provider;
  displayName: string;
  logoUrl: string;
};
