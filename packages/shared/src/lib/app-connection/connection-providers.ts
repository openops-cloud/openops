export type Provider = {
  id: ConnectionProvider;
  displayName: string;
  logoUrl: string;
};

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
