import { exec } from 'child_process';
import { writeFile } from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function formatBlockFolder(blockName: string): Promise<void> {
  try {
    const blockPath = `packages/blocks/${blockName}`;
    await execAsync(`npx prettier --write "${blockPath}/**/*.{ts,js,json}"`);
  } catch (error) {
    console.warn(`⚠️ Failed to format ${blockName} block:`, error);
  }
}

export const generateIndexTsFile = async (
  blockName: string,
  authType: string,
) => {
  const blockNameCamelCase = blockName
    .split('-')
    .map((s, i) => {
      if (i === 0) {
        return s;
      }

      return s[0].toUpperCase() + s.substring(1);
    })
    .join('');

  let authImport = '';
  let authConfig = 'BlockAuth.None()';

  if (authType !== 'none') {
    authImport = `import { ${blockNameCamelCase}Auth } from './lib/auth';`;
    authConfig = `${blockNameCamelCase}Auth`;
  }

  const indexTemplate = `
  import { createBlock, BlockAuth } from "@openops/blocks-framework";
  ${authImport}
  export const ${blockNameCamelCase} = createBlock({
    displayName: "${capitalizeFirstLetter(blockName)}",
    auth: ${authConfig},
    minimumSupportedRelease: '0.20.0',
    logoUrl: "https://static.openops.com/blocks/${blockName}.png",
    authors: [],
    actions: [],
    triggers: [],
  });
  `;

  await writeFile(`packages/blocks/${blockName}/src/index.ts`, indexTemplate);
};

export const generateAuthFile = async (blockName: string, authType: string) => {
  if (authType === 'none') {
    return;
  }

  const blockNameCamelCase = blockName
    .split('-')
    .map((s, i) => {
      if (i === 0) {
        return s;
      }

      return s[0].toUpperCase() + s.substring(1);
    })
    .join('');

  let authTemplate = '';

  switch (authType) {
    case 'secret':
      authTemplate = `
import { BlockAuth } from '@openops/blocks-framework';

export const ${blockNameCamelCase}Auth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: '${blockName}',
  authProviderDisplayName: '${capitalizeFirstLetter(blockName)}',
  authProviderLogoUrl: 'https://static.openops.com/blocks/${blockName}.png',
  description: '',
});
`;
      break;

    case 'custom':
      authTemplate = `
import { BlockAuth, Property } from '@openops/blocks-framework';

export const ${blockNameCamelCase}Auth = BlockAuth.CustomAuth({
  authProviderKey: '${blockName}',
  authProviderDisplayName: '${capitalizeFirstLetter(blockName)}',
  authProviderLogoUrl: 'https://static.openops.com/blocks/${blockName}.png',
  description: 'Configure your ${capitalizeFirstLetter(blockName)} connection',
  required: true,
  props: {
    apiKey: Property.SecretText({
      displayName: 'API Key',
      required: true,
    }),
    baseUrl: Property.ShortText({
      displayName: 'Base URL',
      description: 'The base URL for ${capitalizeFirstLetter(blockName)} API',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
`;
      break;

    case 'oauth2':
      authTemplate = `
import { BlockAuth } from '@openops/blocks-framework';

export const ${blockNameCamelCase}Auth = BlockAuth.OAuth2({
  authProviderKey: '${blockName}',
  authProviderDisplayName: '${capitalizeFirstLetter(blockName)}',
  authProviderLogoUrl: 'https://static.openops.com/blocks/${blockName}.png',
  description: 'Connect to ${capitalizeFirstLetter(blockName)} using OAuth2',
  required: true,
  authUrl: 'https://${blockName}.com/oauth/authorize',
  tokenUrl: 'https://${blockName}.com/oauth/token',
  scope: ['read', 'write'],
});
`;
      break;
  }

  const { mkdir } = await import('fs/promises');
  await mkdir(`packages/blocks/${blockName}/src/lib`, { recursive: true });

  await writeFile(`packages/blocks/${blockName}/src/lib/auth.ts`, authTemplate);
};

export const generateOpinionatedStructure = async (
  blockName: string,
  authType: string,
) => {
  const blockNameCamelCase = blockName
    .split('-')
    .map((s, i) => {
      if (i === 0) {
        return s;
      }

      return s[0].toUpperCase() + s.substring(1);
    })
    .join('');

  const { mkdir } = await import('fs/promises');

  await mkdir(`packages/blocks/${blockName}/src/lib/actions`, {
    recursive: true,
  });
  await mkdir(`packages/blocks/${blockName}/src/lib/common`, {
    recursive: true,
  });
  await mkdir(`packages/blocks/${blockName}/test/actions`, { recursive: true });
  await mkdir(`packages/blocks/${blockName}/test/common`, { recursive: true });

  const actionTemplate = `
import { createAction, Property } from '@openops/blocks-framework';
${
  authType !== 'none'
    ? `import { ${blockNameCamelCase}Auth } from '../auth';`
    : ''
}

export const sampleAction = createAction({
  name: 'sample_action',
  displayName: 'Sample Action',
  description: 'A sample action for ${capitalizeFirstLetter(blockName)}',
  ${authType !== 'none' ? `auth: ${blockNameCamelCase}Auth,` : ''}
  props: {
    input: Property.ShortText({
      displayName: 'Input',
      description: 'Sample input field',
      required: true,
    }),
  },
  async run(context) {
    const { input } = context.propsValue;
    
    // Add your action logic here
    return {
      success: true,
      message: \`Processed: \${input}\`,
    };
  },
});
`;

  await writeFile(
    `packages/blocks/${blockName}/src/lib/actions/sample-action.ts`,
    actionTemplate,
  );

  const serviceTemplate = `
import { ${
    authType !== 'none' ? 'OAuth2PropertyValue' : ''
  } } from '@openops/blocks-framework';
import axios, { AxiosRequestConfig } from 'axios';

export interface ${capitalizeFirstLetter(blockName)}ServiceConfig {
  ${authType !== 'none' ? `auth: OAuth2PropertyValue;` : ''}
  baseUrl?: string;
}

export class ${capitalizeFirstLetter(blockName)}Service {
  private config: ${capitalizeFirstLetter(blockName)}ServiceConfig;

  constructor(config: ${capitalizeFirstLetter(blockName)}ServiceConfig) {
    this.config = config;
  }

  async makeRequest(endpoint: string, options: AxiosRequestConfig = {}) {
    const url = \`\${this.config.baseUrl || 'https://api.${blockName}.com'}\${endpoint}\`;
    
    // Add authentication headers based on auth type
    const headers: Record<string, any> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth headers based on type
    ${
      authType === 'secret'
        ? `if (this.config.auth?.access_token) {
      headers['Authorization'] = \`Bearer \${this.config.auth.access_token}\`;
    }`
        : ''
    }
    ${
      authType === 'oauth2'
        ? `if (this.config.auth?.access_token) {
      headers['Authorization'] = \`Bearer \${this.config.auth.access_token}\`;
    }`
        : ''
    }
    ${
      authType === 'custom'
        ? `if (this.config.auth?.access_token) {
      headers['Authorization'] = \`Bearer \${this.config.auth.access_token}\`;
    }`
        : ''
    }

    // Make the request using axios
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers,
      data: options.data,
      ...options,
    });

    return response.data;
  }

  // Add your service methods here
  async getData() {
    return this.makeRequest('/data');
  }

  async createData(data: any) {
    return this.makeRequest('/data', {
      method: 'POST',
      data,
    });
  }
}
`;

  await writeFile(
    `packages/blocks/${blockName}/src/lib/common/${blockName}-service.ts`,
    serviceTemplate,
  );

  const actionTestTemplate = `
import { sampleAction } from '../../src/lib/actions/sample-action';

describe('sampleAction', () => {
  it('should process input correctly', async () => {
    const mockContext = {
      propsValue: {
        input: 'test input',
      },
      ${
        authType !== 'none'
          ? `auth: {
        access_token: 'mock-access-token',
        data: {},
      },`
          : ''
      }
    };

    const result = await sampleAction.run(mockContext as any);

    expect(result).toEqual({
      success: true,
      message: 'Processed: test input',
    });
  });

  it('should handle empty input', async () => {
    const mockContext = {
      propsValue: {
        input: '',
      },
      ${
        authType !== 'none'
          ? `auth: {
        access_token: 'mock-access-token',
        data: {},
      },`
          : ''
      }
    };

    const result = await sampleAction.run(mockContext as any);

    expect(result).toEqual({
      success: true,
      message: 'Processed: ',
    });
  });
});
`;

  await writeFile(
    `packages/blocks/${blockName}/test/actions/sample-action.test.ts`,
    actionTestTemplate,
  );

  const serviceTestTemplate = `
import { ${
    authType !== 'none' ? `OAuth2PropertyValue ` : ''
  } } from '@openops/blocks-framework';
import axios from 'axios';
import { ${capitalizeFirstLetter(
    blockName,
  )}Service } from '../../src/lib/common/${blockName}-service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('${capitalizeFirstLetter(blockName)}Service', () => {
  let service: ${capitalizeFirstLetter(blockName)}Service;

  beforeEach(() => {
    ${
      authType !== 'none'
        ? `const mockAuth: OAuth2PropertyValue = {
      access_token: 'mock-access-token',
      data: {},
    };

    service = new ${capitalizeFirstLetter(blockName)}Service({
      auth: mockAuth,
      baseUrl: 'https://api.test.com',
    });`
        : `service = new ${capitalizeFirstLetter(blockName)}Service({
      baseUrl: 'https://api.test.com',
    });`
    }
  });

  it('should be instantiated correctly', () => {
    expect(service).toBeInstanceOf(${capitalizeFirstLetter(blockName)}Service);
  });

  it('should make requests with correct configuration', async () => {
    // Mock axios response
    (mockedAxios as any).mockResolvedValue({
      data: { data: 'test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    await service.getData();

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.test.com/data',
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          ${
            authType !== 'none'
              ? `Authorization: 'Bearer mock-access-token',`
              : ''
          }
        }),
      }),
    );
  });

  ${
    authType !== 'none'
      ? `it('should handle requests without auth token', async () => {
    const serviceWithoutAuth = new ${capitalizeFirstLetter(blockName)}Service({
      auth: { data: {} } as OAuth2PropertyValue,
      baseUrl: 'https://api.test.com',
    });

    (mockedAxios as any).mockResolvedValue({
      data: { data: 'test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    await serviceWithoutAuth.getData();

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.test.com/data',
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });`
      : ''
  }
});
`;

  await writeFile(
    `packages/blocks/${blockName}/test/common/${blockName}-service.test.ts`,
    serviceTestTemplate,
  );

  const updatedIndexTemplate = `
import { createBlock } from "@openops/blocks-framework";
${
  authType !== 'none'
    ? `import { ${blockNameCamelCase}Auth } from './lib/auth';`
    : ''
}
import { sampleAction } from './lib/actions/sample-action';

export const ${blockNameCamelCase} = createBlock({
  displayName: "${capitalizeFirstLetter(blockName)}",
  auth: ${
    authType !== 'none' ? `${blockNameCamelCase}Auth` : 'BlockAuth.None()'
  },
  minimumSupportedRelease: '0.20.0',
  logoUrl: "https://static.openops.com/blocks/${blockName}.png",
  authors: [],
  actions: [sampleAction],
  triggers: [],
});
`;

  await writeFile(
    `packages/blocks/${blockName}/src/index.ts`,
    updatedIndexTemplate,
  );

  await formatBlockFolder(blockName);
};
