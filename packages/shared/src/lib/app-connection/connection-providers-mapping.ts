import { Provider, ConnectionProvider } from './connection-providers';

const baseUrl = 'https://static.openops.com';

export const providerMap: Record<Provider, ConnectionProvider> = {
  [Provider.AWS]: {
    id: Provider.AWS,
    displayName: 'AWS',
    logoUrl: `${baseUrl}/blocks/aws.png`,
  },
  [Provider.AZURE]: {
    id: Provider.AZURE,
    displayName: 'Azure',
    logoUrl: `${baseUrl}/blocks/azure.svg`,
  },
  [Provider.DATABRICKS]: {
    id: Provider.DATABRICKS,
    displayName: 'Databricks',
    logoUrl: `${baseUrl}/blocks/databricks.png`,
  },
  [Provider.GITHUB]: {
    id: Provider.GITHUB,
    displayName: 'Github',
    logoUrl: `${baseUrl}/blocks/github.png`,
  },
  [Provider.GCLOUD]: {
    id: Provider.GCLOUD,
    displayName: 'Google Cloud (GCP)',
    logoUrl: `${baseUrl}/blocks/google-cloud.svg`,
  },
  [Provider.JIRA]: {
    id: Provider.JIRA,
    displayName: 'Jira Cloud',
    logoUrl: `${baseUrl}/blocks/jira.png`,
  },
  [Provider.MICROSOFT_TEAMS]: {
    id: Provider.MICROSOFT_TEAMS,
    displayName: 'Microsoft Teams',
    logoUrl: `${baseUrl}/blocks/microsoft-teams.png`,
  },
  [Provider.MONDAY]: {
    id: Provider.MONDAY,
    displayName: 'monday.com',
    logoUrl: `${baseUrl}/blocks/monday.png`,
  },
  [Provider.SLACK]: {
    id: Provider.SLACK,
    displayName: 'Slack',
    logoUrl: `${baseUrl}/blocks/slack.png`,
  },
  [Provider.SFTP]: {
    id: Provider.SFTP,
    displayName: 'SFTP',
    logoUrl: `${baseUrl}/blocks/sftp.svg`,
  },
  [Provider.SMTP]: {
    id: Provider.SMTP,
    displayName: 'SMTP',
    logoUrl: `${baseUrl}/blocks/smtp.png`,
  },
  [Provider.SNOWFLAKE]: {
    id: Provider.SNOWFLAKE,
    displayName: 'Snowflake',
    logoUrl: `${baseUrl}/blocks/snowflake-logo.svg`,
  },
  [Provider.TERNARY]: {
    id: Provider.TERNARY,
    displayName: 'Ternary',
    logoUrl: `${baseUrl}/blocks/ternary.png`,
  },
  [Provider.UMBRELLA]: {
    id: Provider.UMBRELLA,
    displayName: 'Umbrella',
    logoUrl: `${baseUrl}/blocks/umbrella.png`,
  },
};

export function getAllConnectionProviders(): ConnectionProvider[] {
  return Object.values(providerMap);
}

export function getConnectionProvider(id: Provider): ConnectionProvider {
  return providerMap[id];
}
