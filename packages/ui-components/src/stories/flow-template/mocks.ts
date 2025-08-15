import { FlowTemplateMetadataWithIntegrations } from '@/components';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';

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
  'Anomaly Management',
  'Workload Optimization',
  'Rate Optimization',
  'FinOps education & enablement',
];

const categoryLogos = {
  AWS: 'https://static.openops.com/blocks/aws.png',
  Azure: 'https://static.openops.com/blocks/azure.svg',
  GCP: 'https://static.openops.com/blocks/google-cloud.svg',
};

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

const blocks: BlockMetadataModelSummary[] = [
  {
    name: '@openops/block-archera',
    displayName: 'Archera',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/archera.svg',
    version: '0.0.1',
    auth: {
      authProviderKey: 'Archera',
      authProviderDisplayName: 'Archera',
      authProviderLogoUrl: 'https://static.openops.com/blocks/archera.svg',
      description:
        '\nConnecting to the Archera API\n\n1. Go to [https://app.archera.ai](https://app.archera.ai) and log in to your account.\n\n2. Once logged in, go to the API section here: [https://app.archera.ai/settings?section=user&tab=api](https://app.archera.ai/settings?section=user&tab=api)\n\n3. Click Create New API Key if you do not already have one.\n\n4. Copy and securely store your API key.\n\n4. Find your Organization ID: your Organization ID (org_id) is displayed in the API section.\n\n5. Paste your API key and OrgId into the respective fields below',
      required: true,
      props: {
        apiToken: {
          displayName: 'API Token',
          description: 'Your Archera API Token',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        orgId: {
          displayName: 'Organization ID',
          description: 'Your Archera Organization ID',
          required: true,
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 7,
    authors: ['Archera'],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/archera',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-cloudability',
    displayName: 'Cloudability',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/cloudability.png',
    version: '0.0.1',
    auth: {
      required: true,
      authProviderKey: 'cloudability',
      authProviderDisplayName: 'Cloudability',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudability.png',
      description:
        "\nTo get your Cloudability API key:\n\n1. From the Cloudability Dashboard, select the user icon and 'Manage Profile'.\n2. Navigate to the Preferences tab\n3. In the Cloudability API section, select Enable Access. Cloudability generates the API key and shows it in the API KEY field.\n   If access has been previously enabled, select Regenerate Key to revoke the previous key and create a new one.\n\nFor more information, visit the [Cloudability API documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-about-cloudability).\n",
      props: {
        apiUrl: {
          displayName: 'API URL',
          description:
            'US: https://api.cloudability.com/v3\nEMEA: https://api-eu.cloudability.com/v3\nMiddle East: https://api-me.cloudability.com/v3\nAPAC: https://api-au.cloudability.com/v3',
          required: true,
          validators: [
            {
              type: 'STRING',
            },
          ],
          defaultValue: 'https://api.cloudability.com/v3',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        apiKey: {
          required: true,
          displayName: 'API Key',
          description: 'The API key to use to connect to Cloudability',
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 4,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/cloudability',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-cloudfix',
    displayName: 'CloudFix',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/cloudfix.png',
    version: '0.0.1',
    auth: {
      required: true,
      authProviderKey: 'cloudfix',
      authProviderDisplayName: 'CloudFix',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
      description:
        '\nTo get your CloudFix API key:\n\n1. From the CloudFix app, click on "Settings" on the top menu.\n2. Then, click on the "API Tokens" tab, and then "Create Token" button. \n3. Enter a name for your token, and select an appropriate role - Reader, Resource Manager, or Runbook Manager.',
      props: {
        apiUrl: {
          displayName: 'API URL',
          description: 'The base URL for the CloudFix API',
          required: true,
          validators: [
            {
              type: 'STRING',
            },
          ],
          defaultValue: 'https://preview.app.cloudfix.com/api/v3',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        apiKey: {
          required: true,
          displayName: 'API token',
          description: 'The API token to use to connect to CloudFix',
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 6,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/cloudfix',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-cloudhealth',
    displayName: 'CloudHealth',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/cloudhealth.png',
    version: '0.0.1',
    auth: {
      displayName: 'API Key',
      required: true,
      authProviderKey: 'cloudhealth',
      authProviderDisplayName: 'CloudHealth',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudhealth.png',
      description:
        "\nTo get your CloudHealth API key:\n\n1. Log into your CloudHealth account\n2. Click on 'My Profile' in your user settings\n3. In your profile settings, scroll to the API Key section and click 'Get API Key'\n4. Then click 'Save Profile Changes'\n5. Select the appropriate permissions\n\n\nFor more information, visit the [CloudHealth API documentation](https://apidocs.cloudhealthtech.com/).\n",
      type: 'SECRET_TEXT',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 10,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/cloudhealth',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-cloudzero',
    displayName: 'CloudZero',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/cloudzero.png',
    version: '0.0.1',
    auth: {
      displayName: 'API Key',
      required: true,
      authProviderKey: 'cloudzero',
      authProviderDisplayName: 'CloudZero',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudzero.png',
      description:
        '\nTo get your CloudZero API key:\n\n1. Log into your CloudZero account\n2. Navigate to Settings > API Keys\n3. Select "Create New API Key"\n4. Enter a name and description for your key\n5. Select the appropriate API Key Scopes (you must select at least 1)\n6. Select "Create API Key"\n7. Copy the API key displayed (it will not be shown again)\n8. Select "Close"\n\n> ⚠️ WARNING: The API key will not be shown again after creation.\n\nFor more information, visit the [CloudZero API documentation](https://docs.cloudzero.com/reference/authorization).\n',
      type: 'SECRET_TEXT',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 1,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/cloudzero',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-finout',
    displayName: 'Finout',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/finout.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'finout',
      authProviderDisplayName: 'Finout',
      authProviderLogoUrl: 'https://static.openops.com/blocks/finout.png',
      description:
        '\nAuthenticate with your Finout API Token to access Finout services.\nYou can generate an API token by following the instructions in the [Finout API documentation](https://docs.finout.io/configuration/finout-api/generate-an-api-token).\n',
      required: true,
      props: {
        clientId: {
          displayName: 'Client ID',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        secretKey: {
          displayName: 'Secret Key',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 4,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/finout',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-flexera-one',
    displayName: 'Flexera',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/flexera.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'Flexera-One',
      authProviderDisplayName: 'Flexera',
      authProviderLogoUrl: 'https://static.openops.com/blocks/flexera.png',
      description:
        '\nAuthenticate with your Flexera Refresh Token to access Flexera services.\n\nSee [Flexera Documentation](https://docs.flexera.com/flexera/EN/FlexeraAPI/GenerateRefreshToken.htm) for more details.\n',
      required: true,
      props: {
        appRegion: {
          displayName: 'App Region',
          description:
            'Select the region where your Flexera application is hosted.',
          required: true,
          options: {
            options: [
              {
                label: 'US',
                value: 'us',
              },
              {
                label: 'EMEA',
                value: 'eu',
              },
              {
                label: 'APAC',
                value: 'apac',
              },
            ],
          },
          defaultValue: 'us',
          type: 'STATIC_DROPDOWN',
        },
        refreshToken: {
          required: true,
          displayName: 'Refresh Token',
          description: 'The refresh token to use to connect to Flexera',
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        orgId: {
          displayName: 'Organization ID',
          description: 'The organization ID to use for Flexera API calls.',
          required: true,
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        projectId: {
          displayName: 'Project ID',
          description: 'The project ID to use for Flexera API calls.',
          required: true,
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 3,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/flexera-one',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-flexera',
    displayName: 'Flexera Spot',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/flexera-spot.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'Flexera',
      authProviderDisplayName: 'Flexera Spot',
      authProviderLogoUrl: 'https://static.openops.com/blocks/flexera-spot.png',
      description:
        '\nAuthenticate with your Flexera API Token to access Flexera services.\n',
      displayName: 'API Key',
      required: true,
      type: 'SECRET_TEXT',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 2,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/flexera',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-kion',
    displayName: 'Kion',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/kion.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'kion',
      authProviderDisplayName: 'Kion',
      authProviderLogoUrl: 'https://static.openops.com/blocks/kion.png',
      description:
        '\nTo get your Kion API key:\n\n1. Log into your Kion platform\n2. Click on your initials in the top right corner.\n3. Select App API Keys\n4. Generate a new API Key\n5. Store the API Key\n\nFor more information, visit the [Kion API documentation](https://support.kion.io/hc/en-us/articles/360055160791-App-API-Access).\n',
      required: true,
      props: {
        instanceUrl: {
          displayName: 'Instance URL',
          description:
            'The URL of your Kion instance (e.g., https://your-instance.kion.io)',
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
        apiKey: {
          displayName: 'API Key',
          description: 'Your Kion API Key',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 1,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/kion',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-pelanor',
    displayName: 'Pelanor',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/pelanor.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'pelanor',
      authProviderDisplayName: 'Pelanor',
      authProviderLogoUrl: 'https://static.openops.com/blocks/pelanor.png',
      description:
        '\nAuthenticate with your Pelanor API Token to access Pelanor services.\n\n1. Go to [https://app.pelanor.io](https://app.pelanor.io) or [https://app-eu.pelanor.io](https://app-eu.pelanor.io) and log in to your account.\n2. Once logged in, go to Settings > API Tokens.\n3. Click "Add New API Token" if you do not already have one.\n4. Copy and securely store your API token and secret.\n5. Paste your API token and secret into the fields below.\n',
      required: true,
      props: {
        tokenId: {
          displayName: 'Token ID',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        tokenSecret: {
          displayName: 'Token Secret',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        apiUrl: {
          displayName: 'API URL',
          description:
            'US: https://api.pelanor.io\nEU: https://api-eu.pelanor.io',
          required: true,
          validators: [
            {
              type: 'STRING',
            },
          ],
          defaultValue: 'https://api.pelanor.io',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 1,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/pelanor',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-ternary',
    displayName: 'Ternary',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/ternary.png',
    version: '0.0.2',
    auth: {
      authProviderKey: 'Ternary',
      authProviderDisplayName: 'Ternary',
      authProviderLogoUrl: 'https://static.openops.com/blocks/ternary.png',
      description:
        '\nTernary API documentation:\nhttps://docs.ternary.app/reference/using-the-api',
      required: true,
      props: {
        apiKey: {
          displayName: 'API key',
          defaultValue: '',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        tenantId: {
          displayName: 'Tenant ID',
          defaultValue: '',
          required: true,
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        apiURL: {
          displayName: 'Base URL',
          defaultValue: '',
          description:
            'For example: https://core-api.eu.ternary.app\nNote: For the Net Cost block, you need to set the Base URL to https://api.eu.ternary.app',
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
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 8,
    authors: ['Quilyx'],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/ternary',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-anodot',
    displayName: 'Umbrella',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/umbrella.png',
    version: '0.0.1',
    auth: {
      authProviderKey: 'Umbrella',
      authProviderDisplayName: 'Umbrella',
      authProviderLogoUrl: 'https://static.openops.com/blocks/umbrella.png',
      description: 'The authentication to use to connect to Umbrella',
      required: true,
      props: {
        authUrl: {
          displayName: 'Authentication URL',
          description: 'The URL to use to authenticate',
          required: true,
          validators: [
            {
              type: 'STRING',
            },
          ],
          defaultValue: 'https://tokenizer.mypileus.io/prod',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        apiUrl: {
          displayName: 'API URL',
          description: 'The URL to use to request Umbrella API',
          required: true,
          validators: [
            {
              type: 'STRING',
            },
          ],
          defaultValue: 'https://api.umbrellacost.io/api',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        username: {
          required: true,
          displayName: 'Username',
          description: 'The username to use to connect to Umbrella',
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        password: {
          required: true,
          displayName: 'Password',
          description: 'The password to use to connect to Umbrella',
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 8,
    authors: ['OpenOps'],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/anodot',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
  {
    name: '@openops/block-vegacloud',
    displayName: 'Vega Cloud',
    description: '',
    logoUrl: 'https://static.openops.com/blocks/vegacloud.svg',
    version: '0.0.1',
    auth: {
      authProviderKey: 'vegacloud',
      authProviderDisplayName: 'Vega Cloud',
      authProviderLogoUrl: 'https://static.openops.com/blocks/vegacloud.svg',
      description:
        '\nTo generate a Vega Cloud API Client ID and Secret, visit the [Vega Cloud API documentation](https://docs.vegacloud.io/docs/platformguide/platform_settings/profile_settings/apiclientreg).\n',
      required: true,
      props: {
        clientSecret: {
          displayName: 'Client Secret',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        clientId: {
          displayName: 'Client ID',
          required: true,
          type: 'SECRET_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
        realm: {
          displayName: 'Realm',
          description: 'Your Vega Cloud realm',
          required: true,
          type: 'SHORT_TEXT',
          defaultValidators: [
            {
              type: 'STRING',
            },
          ],
        },
      },
      type: 'CUSTOM_AUTH',
      displayName: 'Connection',
    },
    projectUsage: 0,
    minimumSupportedRelease: '0.20.0',
    actions: 1,
    authors: [],
    categories: ['FINOPS'],
    triggers: 0,
    directoryPath: '/usr/src/app/dist/packages/blocks/vegacloud',
    packageType: 'REGISTRY',
    blockType: 'OFFICIAL',
  },
];

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
  blocks,
  categoryLogos,
};
