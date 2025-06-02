import { ConnectionProvider, Provider } from './providers';

const baseUrl = 'https://static.openops.com';

export const providerMap: Record<ConnectionProvider, Provider> = {
  [ConnectionProvider.AWS]: {
    id: ConnectionProvider.AWS,
    displayName: 'AWS',
    logoUrl: `${baseUrl}/blocks/aws.png`,
  },
  [ConnectionProvider.AZURE]: {
    id: ConnectionProvider.AZURE,
    displayName: 'Azure',
    logoUrl: `${baseUrl}/blocks/azure.svg`,
  },
  [ConnectionProvider.DATABRICKS]: {
    id: ConnectionProvider.DATABRICKS,
    displayName: 'Databricks',
    logoUrl: `${baseUrl}/blocks/databricks.png`,
  },
  [ConnectionProvider.GITHUB]: {
    id: ConnectionProvider.GITHUB,
    displayName: 'Github',
    logoUrl: `${baseUrl}/blocks/github.png`,
  },
  [ConnectionProvider.GCLOUD]: {
    id: ConnectionProvider.GCLOUD,
    displayName: 'Google Cloud (GCP)',
    logoUrl: `${baseUrl}/blocks/google-cloud.svg`,
  },
  [ConnectionProvider.JIRA]: {
    id: ConnectionProvider.JIRA,
    displayName: 'Jira Cloud',
    logoUrl: `${baseUrl}/blocks/jira.png`,
  },
  [ConnectionProvider.MICROSOFT_TEAMS]: {
    id: ConnectionProvider.MICROSOFT_TEAMS,
    displayName: 'Microsoft Teams',
    logoUrl: `${baseUrl}/blocks/microsoft-teams.png`,
  },
  [ConnectionProvider.MONDAY]: {
    id: ConnectionProvider.MONDAY,
    displayName: 'monday.com',
    logoUrl: `${baseUrl}/blocks/monday.png`,
  },
  [ConnectionProvider.SLACK]: {
    id: ConnectionProvider.SLACK,
    displayName: 'Slack',
    logoUrl: `${baseUrl}/blocks/slack.png`,
  },
  [ConnectionProvider.SFTP]: {
    id: ConnectionProvider.SFTP,
    displayName: 'SFTP',
    logoUrl: `${baseUrl}/blocks/sftp.svg`,
  },
  [ConnectionProvider.SMTP]: {
    id: ConnectionProvider.SMTP,
    displayName: 'SMTP',
    logoUrl: `${baseUrl}/blocks/smtp.png`,
  },
  [ConnectionProvider.SNOWFLAKE]: {
    id: ConnectionProvider.SNOWFLAKE,
    displayName: 'Snowflake',
    logoUrl: `${baseUrl}/blocks/snowflake-logo.svg`,
  },
  [ConnectionProvider.TERNARY]: {
    id: ConnectionProvider.TERNARY,
    displayName: 'Ternary',
    logoUrl: `${baseUrl}/blocks/ternary.png`,
  },
  [ConnectionProvider.UMBRELLA]: {
    id: ConnectionProvider.UMBRELLA,
    displayName: 'Umbrella',
    logoUrl: `${baseUrl}/blocks/umbrella.png`,
  },
};
