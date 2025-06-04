import { FlowTemplateMetadataWithIntegrations } from '@/components';

const services = [
  'Compute',
  'Network',
  'Storage',
  'Databases',
  'Security',
  'Developmment & Integration',
  'Analytics & Big Data',
  'Application Hosting',
];

const domains = [
  'Allocation',
  'Anomaly management',
  'Workload optimization',
  'Rate optimization',
  'FinOps education & enablement',
];

const baseTemplate: FlowTemplateMetadataWithIntegrations = {
  id: '0Gk00B4HVNRqSzCkFjZh0',
  created: '2025-02-03T07:27:06.840Z',
  updated: '2025-02-03T07:27:06.840Z',
  name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pulvinar id purus nec tempor. ',
  description:
    'Services: ["Compute", "Network", "Storage", "Databases", "Security", "Development & Integration", "Analytics & Big Data", "Application Hosting"]\nDomains: ["Allocation", "Anomaly management", "Workload optimization", "Rate optimization", "FinOps education & enablement"]',
  categories: ['AWS'],
  tags: [''],
  services: [
    'Compute',
    'Network',
    'Storage',
    'Databases',
    'Security',
    'Development & Integration',
    'Analytics & Big Data',
    'Application Hosting',
  ],
  domains: [
    'Allocation',
    'Anomaly management',
    'Workload optimization',
    'Rate optimization',
    'FinOps education & enablement',
  ],
  blocks: [
    '@openops/block-jira-cloud',
    '@openops/block-openops-tables',
    '@openops/block-text-helper',
    '@openops/block-store',
    '@openops/block-end-flow',
    '@openops/block-aws',
  ],
  projectId: 'J42AJxILqxYn3tqciqYz1',
  organizationId: 'Q6ERTBSdZetYf8opBoCNc',
  integrations: [
    {
      name: '@openops/block-jira-cloud',
      displayName: 'Jira Cloud',
      description: 'Issue tracking and project management',
      logoUrl: 'https://static.openops.com/blocks/jira.png',
      version: '0.0.7',
      auth: {
        description:
          '\nYou can generate your API token from:\n***https://id.atlassian.com/manage-profile/security/api-tokens***\n    ',
        required: true,
        props: {
          instanceUrl: {
            displayName: 'Instance URL',
            description:
              'The link of your Jira instance (e.g https://example.atlassian.net)',
            required: true,
            validators: [
              {
                type: 'STRING',
              },
            ],
            type: 'SHORT_TEXT',
            defaultValidators: [
              {
                type: 'STRING',
              },
            ],
          },
          email: {
            displayName: 'Email',
            description: 'The email you use to login to Jira',
            required: true,
            validators: [
              {
                type: 'STRING',
              },
            ],
            type: 'SHORT_TEXT',
            defaultValidators: [
              {
                type: 'STRING',
              },
            ],
          },
          apiToken: {
            displayName: 'API Token',
            description: 'Your Jira API Token',
            required: true,
            type: 'SECRET_TEXT',
          },
        },
        type: 'CUSTOM_AUTH',
        displayName: 'Connection',
      },
      projectUsage: 0,
      minimumSupportedRelease: '0.9.0',
      actions: 10,
      authors: ['kishanprmr', 'MoShizzle', 'abuaboud'],
      categories: ['PRODUCTIVITY'],
      triggers: 2,
      directoryPath: '/usr/src/app/dist/packages/blocks/jira-cloud',
      projectId: 'J42AJxILqxYn3tqciqYz1',
      packageType: 'REGISTRY',
      blockType: 'OFFICIAL',
    },
    {
      name: '@openops/block-openops-tables',
      displayName: 'OpenOps Tables',
      description: '',
      logoUrl: 'https://static.openops.com/blocks/tables.svg',
      version: '0.0.1',
      projectUsage: 0,
      minimumSupportedRelease: '0.20.0',
      actions: 3,
      authors: [],
      categories: [],
      triggers: 0,
      directoryPath: '/usr/src/app/dist/packages/blocks/openops-tables',
      projectId: 'J42AJxILqxYn3tqciqYz1',
      packageType: 'REGISTRY',
      blockType: 'OFFICIAL',
    },
    {
      name: '@openops/block-aws',
      displayName: 'AWS',
      description: '',
      logoUrl: 'https://static.openops.com/blocks/aws.png',
      version: '0.0.3',
      auth: {
        props: {
          accessKeyId: {
            displayName: 'Access Key ID',
            required: true,
            type: 'SECRET_TEXT',
          },
          secretAccessKey: {
            displayName: 'Secret Access Key',
            required: true,
            type: 'SECRET_TEXT',
          },
          defaultRegion: {
            displayName: 'Default Region',
            required: true,
            type: 'SHORT_TEXT',
            defaultValidators: [
              {
                type: 'STRING',
              },
            ],
          },
          endpoint: {
            displayName: 'Custom Endpoint (optional)',
            required: false,
            type: 'SHORT_TEXT',
            defaultValidators: [
              {
                type: 'STRING',
              },
            ],
          },
          roles: {
            displayName: 'Roles',
            required: false,
            properties: {
              assumeRoleArn: {
                displayName: 'Assume Role ARN',
                required: true,
                type: 'SHORT_TEXT',
                defaultValidators: [
                  {
                    type: 'STRING',
                  },
                ],
              },
              assumeRoleExternalId: {
                displayName: 'Assume Role External ID',
                required: false,
                type: 'SHORT_TEXT',
                defaultValidators: [
                  {
                    type: 'STRING',
                  },
                ],
              },
              accountName: {
                displayName: 'Account Alias',
                required: true,
                type: 'SHORT_TEXT',
                defaultValidators: [
                  {
                    type: 'STRING',
                  },
                ],
              },
            },
            type: 'ARRAY',
          },
        },
        required: true,
        type: 'CUSTOM_AUTH',
        displayName: 'Connection',
      },
      projectUsage: 0,
      minimumSupportedRelease: '0.8.0',
      actions: 24,
      authors: ['OpenOps'],
      categories: [],
      triggers: 0,
      directoryPath: '/usr/src/app/dist/packages/blocks/aws',
      projectId: 'J42AJxILqxYn3tqciqYz1',
      packageType: 'REGISTRY',
      blockType: 'OFFICIAL',
    },
  ],
};

export const mocks = {
  categories: [
    {
      name: 'AWS',
      services,
    },
    {
      name: 'Azure',
      services,
    },
  ],
  services,
  domains,
  baseTemplate,
};
