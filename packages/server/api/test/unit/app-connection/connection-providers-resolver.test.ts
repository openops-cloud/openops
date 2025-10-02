const getCurrentReleaseMock = jest.fn();
jest.mock('../../../src/app/flags/flag.service', () => ({
  flagService: {
    getCurrentRelease: getCurrentReleaseMock,
  },
}));

const getEditionMock = jest.fn();
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    getEdition: getEditionMock,
  },
  logger: {
    warn: jest.fn(),
  },
}));

const listBlocksMock = jest.fn();
jest.mock('../../../src/app/blocks/block-metadata-service', () => ({
  blockMetadataService: {
    list: listBlocksMock,
  },
}));

import { logger } from '@openops/server-shared';
import {
  findBlockByAuthProviderKey,
  getAuthProviderMetadata,
  getProviderMetadataForAllBlocks,
  resolveProvidersForBlocks,
} from '../../../src/app/app-connection/connection-providers-resolver';

describe('resolveProvidersForBlocks', () => {
  const projectId = 'project-123';
  const release = 'release-1.0';
  const edition = 'community';

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentReleaseMock.mockResolvedValue(release);
    getEditionMock.mockReturnValue(edition);
  });

  test('should resolve providers for blocks', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
        },
      },
      {
        name: 'block2',
        auth: {
          authProviderKey: 'Github',
        },
      },
      {
        name: 'block3',
        auth: {
          authProviderKey: 'AWS',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'block2', 'block3'],
      projectId,
    );

    expect(getCurrentReleaseMock).toHaveBeenCalled();
    expect(getEditionMock).toHaveBeenCalled();
    expect(listBlocksMock).toHaveBeenCalledWith({
      includeHidden: false,
      projectId,
      release,
      edition,
    });

    expect(result).toEqual({
      AWS: ['block1', 'block3'],
      Github: ['block2'],
    });
  });

  test('should handle non-existent blocks', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'non-existent-block'],
      projectId,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'Block not found. Block name: non-existent-block',
    );

    expect(result).toEqual({
      AWS: ['block1'],
    });
  });

  test('should deduplicate providers', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
        },
      },
      {
        name: 'block2',
        auth: {
          authProviderKey: 'AWS',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'block2'],
      projectId,
    );

    expect(result).toEqual({
      AWS: ['block1', 'block2'],
    });
  });

  test('should handle blocks without providers', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
        },
      },
      {
        name: 'block2',
        auth: null,
      },
      {
        name: 'block3',
        auth: {},
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'block2', 'block3'],
      projectId,
    );

    expect(result).toEqual({
      AWS: ['block1'],
    });
  });

  test('should return empty array for empty block list', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks([], projectId);

    expect(result).toEqual({});
  });
});

describe('getProviderMetadataForAllBlocks', () => {
  const projectId = 'project-123';
  const release = 'release-1.0';
  const edition = 'community';

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentReleaseMock.mockResolvedValue(release);
    getEditionMock.mockReturnValue(edition);
  });

  test('should return correct provider metadata for multiple providers and blocks', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'AWS',
          authProviderDisplayName: 'Amazon Web Services',
          authProviderLogoUrl: 'aws-logo.png',
        },
      },
      {
        name: 'block2',
        auth: {
          authProviderKey: 'GitHub',
          authProviderDisplayName: 'GitHub',
          authProviderLogoUrl: 'github-logo.png',
        },
      },
      {
        name: 'block3',
        auth: {
          authProviderKey: 'AWS',
          authProviderDisplayName: 'Amazon Web Services',
          authProviderLogoUrl: 'aws-logo.png',
        },
      },
    ];
    listBlocksMock.mockResolvedValue(blocks);

    const result = await getProviderMetadataForAllBlocks(projectId);
    expect(result).toHaveProperty('AWS');
    expect(result).toHaveProperty('GitHub');
    expect(result['AWS']?.supportedBlocks).toEqual(['block1', 'block3']);
    expect(result['GitHub']?.supportedBlocks).toEqual(['block2']);
    expect(result['AWS']?.authProviderDisplayName).toBe('Amazon Web Services');
    expect(result['GitHub']?.authProviderLogoUrl).toBe('github-logo.png');
  });

  test('should skip blocks without auth or provider', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: null,
      },
      {
        name: 'block2',
        auth: {},
      },
      {
        name: 'block3',
        auth: {
          authProviderKey: 'AWS',
          authProviderDisplayName: 'Amazon Web Services',
          authProviderLogoUrl: 'aws-logo.png',
        },
      },
    ];
    listBlocksMock.mockResolvedValue(blocks);
    const result = await getProviderMetadataForAllBlocks(projectId);
    expect(Object.keys(result)).toEqual(['AWS']);
    expect(result['AWS']?.supportedBlocks).toEqual(['block3']);
  });

  test('should return empty object if no blocks have providers', async () => {
    const blocks = [
      { name: 'block1', auth: null },
      { name: 'block2', auth: {} },
    ];
    listBlocksMock.mockResolvedValue(blocks);
    const result = await getProviderMetadataForAllBlocks(projectId);
    expect(result).toEqual({});
  });
});

describe('getAuthProviderMetadata', () => {
  const projectId = 'project-123';
  const release = 'release-1.0';
  const edition = 'community';
  const authProviderKey = 'AWS';

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentReleaseMock.mockResolvedValue(release);
    getEditionMock.mockReturnValue(edition);
  });

  test('should return auth metadata for a block with matching authProviderKey', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'GitHub',
          authProviderDisplayName: 'GitHub',
          authProviderLogoUrl: 'github-logo.png',
        },
      },
      {
        name: 'block2',
        auth: {
          authProviderKey: 'AWS',
          authProviderDisplayName: 'Amazon Web Services',
          authProviderLogoUrl: 'aws-logo.png',
          secretKeys: ['accessKey', 'secretKey'],
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await getAuthProviderMetadata(authProviderKey, projectId);

    expect(getCurrentReleaseMock).toHaveBeenCalled();
    expect(getEditionMock).toHaveBeenCalled();
    expect(listBlocksMock).toHaveBeenCalledWith({
      includeHidden: false,
      projectId,
      release,
      edition,
    });

    expect(result).toEqual({
      authProviderKey: 'AWS',
      authProviderDisplayName: 'Amazon Web Services',
      authProviderLogoUrl: 'aws-logo.png',
      secretKeys: ['accessKey', 'secretKey'],
    });
  });

  test('should return undefined if no block has matching authProviderKey', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          authProviderKey: 'GitHub',
          authProviderDisplayName: 'GitHub',
          authProviderLogoUrl: 'github-logo.png',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await getAuthProviderMetadata(
      'NonExistentProvider',
      projectId,
    );

    expect(result).toBeUndefined();
  });

  test('should return undefined if blocks list is empty', async () => {
    listBlocksMock.mockResolvedValue([]);

    const result = await getAuthProviderMetadata(authProviderKey, projectId);

    expect(result).toBeUndefined();
  });

  test('should return undefined if blocks have no auth property', async () => {
    const blocks = [
      { name: 'block1', auth: null },
      { name: 'block2', auth: {} },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await getAuthProviderMetadata(authProviderKey, projectId);

    expect(result).toBeUndefined();
  });
});

describe('findBlockByAuthProviderKey', () => {
  const projectId = 'project-123';
  const release = 'release-1.0';
  const edition = 'community';
  const authProviderKey = 'Linear';

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentReleaseMock.mockResolvedValue(release);
    getEditionMock.mockReturnValue(edition);
  });

  test('should return block name and version for matching authProviderKey', async () => {
    const blocks = [
      {
        name: 'block1',
        version: '1.0.0',
        auth: {
          authProviderKey: 'GitHub',
        },
      },
      {
        name: 'block2',
        version: '2.1.0',
        auth: {
          authProviderKey: 'Linear',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await findBlockByAuthProviderKey(authProviderKey, projectId);
    expect(result).toEqual({ name: 'block2', version: '2.1.0' });
  });

  test('should throw error if no block matches the authProviderKey', async () => {
    const blocks = [
      {
        name: 'block1',
        version: '1.0.0',
        auth: {
          authProviderKey: 'AWS',
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    await expect(
      findBlockByAuthProviderKey(authProviderKey, projectId),
    ).rejects.toThrow(
      `Block with authProviderKey "Linear" not found for project "project-123".`,
    );
  });

  test('should throw error if blocks list is empty', async () => {
    listBlocksMock.mockResolvedValue([]);

    await expect(
      findBlockByAuthProviderKey(authProviderKey, projectId),
    ).rejects.toThrow(
      `Block with authProviderKey "Linear" not found for project "project-123".`,
    );
  });

  test('should throw error if blocks have no auth property', async () => {
    const blocks = [
      { name: 'block1', version: '1.0.0', auth: null },
      { name: 'block2', version: '2.0.0', auth: {} },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    await expect(
      findBlockByAuthProviderKey(authProviderKey, projectId),
    ).rejects.toThrow(
      `Block with authProviderKey "Linear" not found for project "project-123".`,
    );
  });
});
