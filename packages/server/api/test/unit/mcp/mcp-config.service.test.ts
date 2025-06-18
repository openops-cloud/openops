const mockedOpenOpsId = jest.fn().mockReturnValue('mocked-id');

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: mockedOpenOpsId,
}));

const findOneByMock = jest.fn();
const saveMock = jest.fn();
const deleteMock = jest.fn();
const findByMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
    save: saveMock,
    delete: deleteMock,
    findBy: findByMock,
  }),
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendMcpConfigSavedEvent: jest.fn(),
  sendMcpConfigDeletedEvent: jest.fn(),
}));

import { SaveMcpConfigRequest } from '@openops/shared';
import { mcpConfigService } from '../../../src/app/mcp/config/mcp-config.service';
import {
  sendMcpConfigDeletedEvent,
  sendMcpConfigSavedEvent,
} from '../../../src/app/telemetry/event-models';

describe('mcpConfigService', () => {
  const projectId = 'test-project';
  const id = 'test-id';
  const userId = 'test-user';
  const mockMcpConfig = {
    id: 'mocked-id',
    projectId,
    name: 'aws-cost',
    config: {
      enabled: true,
      connectionName: 'test-aws-connection',
    },
    created: '2025-04-22T12:00:00Z',
    updated: '2025-04-22T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    const baseRequest = {
      name: 'aws-cost',
      config: {
        enabled: true,
        connectionName: 'test-aws-connection',
      },
    } as unknown as SaveMcpConfigRequest;

    test('should create a new MCP config when one does not exist', async () => {
      findOneByMock.mockResolvedValue(null);
      saveMock.mockResolvedValue(mockMcpConfig);

      const result = await mcpConfigService.save({
        projectId,
        request: baseRequest,
        userId,
      });

      expect(findOneByMock).not.toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalledWith({
        ...baseRequest,
        id: 'mocked-id',
        projectId,
        created: expect.any(String),
        updated: expect.any(String),
      });
      expect(result).toEqual(mockMcpConfig);
      expect(sendMcpConfigSavedEvent).toHaveBeenCalledWith({
        id: mockMcpConfig.id,
        userId,
        projectId,
        name: 'aws-cost',
        config: mockMcpConfig.config,
        created: expect.any(String),
        updated: expect.any(String),
      });
    });

    test('should update existing MCP config if it exists', async () => {
      const existingId = 'existing-id';
      findOneByMock.mockResolvedValue({
        id: existingId,
        created: '2025-04-22T12:00:00Z',
      });
      saveMock.mockResolvedValue({
        ...mockMcpConfig,
        id: existingId,
      });

      const result = await mcpConfigService.save({
        projectId,
        request: { id: existingId, ...baseRequest },
        userId,
      });

      expect(findOneByMock).toHaveBeenCalledWith({ id: existingId, projectId });
      expect(saveMock).toHaveBeenCalledWith({
        ...baseRequest,
        id: existingId,
        projectId,
        created: '2025-04-22T12:00:00Z',
        updated: expect.any(String),
      });
      expect(result).toEqual({
        ...mockMcpConfig,
        id: existingId,
      });
      expect(sendMcpConfigSavedEvent).toHaveBeenCalledWith({
        id: existingId,
        userId,
        projectId,
        name: 'aws-cost',
        config: mockMcpConfig.config,
        created: '2025-04-22T12:00:00Z',
        updated: expect.any(String),
      });
    });
  });

  describe('get', () => {
    test('should return MCP config when it exists', async () => {
      findOneByMock.mockResolvedValue(mockMcpConfig);

      const result = await mcpConfigService.get({ id, projectId });

      expect(findOneByMock).toHaveBeenCalledWith({ id, projectId });
      expect(result).toEqual(mockMcpConfig);
    });

    test('should return undefined when MCP config does not exist', async () => {
      findOneByMock.mockResolvedValue(null);

      const result = await mcpConfigService.get({ id, projectId });

      expect(findOneByMock).toHaveBeenCalledWith({ id, projectId });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete MCP config and send event', async () => {
      const configId = 'test-config-id';
      deleteMock.mockResolvedValue(undefined);

      await mcpConfigService.delete({
        projectId,
        id: configId,
        userId,
      });

      expect(deleteMock).toHaveBeenCalledWith({ projectId, id: configId });
      expect(sendMcpConfigDeletedEvent).toHaveBeenCalledWith({
        id: configId,
        userId,
        projectId,
      });
    });
  });

  describe('list', () => {
    const mockMcpConfigs = [
      {
        id: 'mocked-id-1',
        projectId,
        name: 'aws-cost',
        config: {
          enabled: true,
          connectionName: 'test-aws-connection',
        },
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
      {
        id: 'mocked-id-2',
        projectId,
        name: 'openops-tools',
        config: {
          enabled: false,
          settings: {},
        },
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return all MCP configs for a project', async () => {
      findByMock.mockResolvedValue(mockMcpConfigs);

      const result = await mcpConfigService.list(projectId);

      expect(findByMock).toHaveBeenCalledWith({ projectId });
      expect(result).toEqual(mockMcpConfigs);
    });

    test('should return empty array when no MCP configs exist', async () => {
      findByMock.mockResolvedValue([]);

      const result = await mcpConfigService.list(projectId);

      expect(findByMock).toHaveBeenCalledWith({ projectId });
      expect(result).toEqual([]);
    });
  });
});
