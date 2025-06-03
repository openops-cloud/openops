import { Type } from '@sinclair/typebox';

export enum ConnectionProvider {
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

export const Provider = Type.Object({
  logoUrl: Type.String(),
  displayName: Type.String(),
  id: Type.Enum(ConnectionProvider),
});

export type Provider = {
  id: ConnectionProvider;
  displayName: string;
  logoUrl: string;
};
