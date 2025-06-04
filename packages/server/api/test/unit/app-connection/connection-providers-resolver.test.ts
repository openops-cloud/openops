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
import { Provider } from '@openops/shared';
import { resolveProvidersForBlocks } from '../../../src/app/app-connection/connection-providers-resolver';

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
          provider: {
            id: Provider.AWS,
          },
        },
      },
      {
        name: 'block2',
        auth: {
          provider: {
            id: Provider.GITHUB,
          },
        },
      },
      {
        name: 'block3',
        auth: {
          provider: {
            id: Provider.AWS,
          },
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'block2'],
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

    expect(result).toEqual([Provider.AWS, Provider.GITHUB]);
    expect(result.length).toBe(2);
  });

  test('should handle non-existent blocks', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          provider: {
            id: Provider.AWS,
          },
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

    expect(result).toEqual([Provider.AWS]);
    expect(result.length).toBe(1);
  });

  test('should deduplicate providers', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          provider: {
            id: Provider.AWS,
          },
        },
      },
      {
        name: 'block2',
        auth: {
          provider: {
            id: Provider.AWS,
          },
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks(
      ['block1', 'block2'],
      projectId,
    );

    expect(result).toEqual([Provider.AWS]);
    expect(result.length).toBe(1);
  });

  test('should handle blocks without providers', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          provider: {
            id: Provider.AWS,
          },
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

    expect(result).toEqual([Provider.AWS]);
    expect(result.length).toBe(1);
  });

  test('should return empty array for empty block list', async () => {
    const blocks = [
      {
        name: 'block1',
        auth: {
          provider: {
            id: Provider.AWS,
          },
        },
      },
    ];

    listBlocksMock.mockResolvedValue(blocks);

    const result = await resolveProvidersForBlocks([], projectId);

    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });
});
