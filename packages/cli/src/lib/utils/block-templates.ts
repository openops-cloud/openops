import { exec } from 'child_process';
import { writeFile } from 'fs/promises';
import path from 'path';
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
    logoUrl: "/blocks/${blockName}.png",
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
  authProviderLogoUrl: '/blocks/${blockName}.png',
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
  authProviderLogoUrl: '/blocks/${blockName}.png',
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
  authProviderLogoUrl: '/blocks/${blockName}.png',
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

  let indexTemplate = '';

  if (authType !== 'none') {
    indexTemplate = `
import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { ${blockNameCamelCase}Auth } from './lib/auth';

export const ${blockNameCamelCase} = createBlock({
  displayName: "${capitalizeFirstLetter(blockName)}",
  auth: ${blockNameCamelCase}Auth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: "/blocks/${blockName}.png",
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.${blockName}.com',
      auth: ${blockNameCamelCase}Auth,
      additionalProps: {
        documentation: Property.MarkDown({
          value: 'For more information, visit the [${capitalizeFirstLetter(
            blockName,
          )} API documentation](https://docs.${blockName}.com/reference/introduction).',
        }),
      },
    }),
  ],
  triggers: [],
});
`;
  } else {
    indexTemplate = `
import { BlockAuth, createBlock } from "@openops/blocks-framework";

export const ${blockNameCamelCase} = createBlock({
  displayName: "${capitalizeFirstLetter(blockName)}",
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: "/blocks/${blockName}.png",
  authors: [],
  actions: [],
  triggers: [],
});
`;
  }

  await writeFile(`packages/blocks/${blockName}/src/index.ts`, indexTemplate);

  let testTemplate = '';

  if (authType !== 'none') {
    const authTypeMap = {
      secret: 'SECRET_TEXT',
      oauth2: 'OAUTH2',
      custom: 'CUSTOM_AUTH',
    };

    testTemplate = `
import { ${blockNameCamelCase} } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(${blockNameCamelCase}.auth).toMatchObject({
      type: '${authTypeMap[authType as keyof typeof authTypeMap]}',
      required: true,
      authProviderKey: '${blockName}',
      authProviderDisplayName: '${capitalizeFirstLetter(blockName)}',
      authProviderLogoUrl: '/blocks/${blockName}.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(${blockNameCamelCase}.actions()).length).toBe(1);
    expect(${blockNameCamelCase}.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
`;
  } else {
    testTemplate = `
import { ${blockNameCamelCase} } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(${blockNameCamelCase}.auth).toBeUndefined();
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(${blockNameCamelCase}.actions()).length).toBe(0);
  });
});
`;
  }

  const testFolder = path.join('packages', 'blocks', blockName, 'test');
  await mkdir(testFolder, {
    recursive: true,
  });
  await writeFile(path.join(testFolder, 'index.test.ts'), testTemplate);

  await formatBlockFolder(blockName);
};
