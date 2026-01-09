import { resolveTokenProvider, TablesMcpEndpoint } from '@openops/common';
import { Project } from '@openops/shared';
import { openopsTables } from '../../../src/app/openops-tables';
import { projectService } from '../../../src/app/project/project-service';

jest.mock('@openops/common', () => ({
  resolveTokenProvider: jest.fn(),
}));

jest.mock('../../../src/app/openops-tables', () => ({
  openopsTables: {
    getMcpEndpointList: jest.fn(),
  },
}));

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: jest.fn(),
}));

describe('projectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectMcpEndpoint', () => {
    const projectId = 'project-id';
    const workspaceId = 123;
    const project = {
      id: projectId,
      tablesDatabaseId: 456,
      tablesDatabaseToken: 'encrypted-token',
      tablesWorkspaceId: workspaceId,
    } as unknown as Project;

    const endpoint: TablesMcpEndpoint = {
      id: 1,
      name: 'Test Endpoint',
      key: 'test-key',
      workspace_id: workspaceId,
      workspace_name: 'Test Workspace',
      created: '2025-01-01T00:00:00Z',
    };

    const otherEndpoint: TablesMcpEndpoint = {
      id: 2,
      name: 'Other Endpoint',
      key: 'other-key',
      workspace_id: 999,
      workspace_name: 'Other Workspace',
      created: '2025-01-01T00:00:00Z',
    };

    it('should return the matching MCP endpoint', async () => {
      const getOneOrThrowSpy = jest
        .spyOn(projectService, 'getOneOrThrow')
        .mockResolvedValue(project);
      (resolveTokenProvider as jest.Mock).mockResolvedValue('resolved-token');
      (openopsTables.getMcpEndpointList as jest.Mock).mockResolvedValue([
        endpoint,
        otherEndpoint,
      ]);

      const result = await projectService.getProjectMcpEndpoint(projectId);

      expect(result).toEqual(endpoint);
      expect(getOneOrThrowSpy).toHaveBeenCalledWith(projectId);
      expect(resolveTokenProvider).toHaveBeenCalledWith({
        tablesDatabaseId: project.tablesDatabaseId,
        tablesDatabaseToken: project.tablesDatabaseToken,
      });
      expect(openopsTables.getMcpEndpointList).toHaveBeenCalledWith(
        'resolved-token',
      );
      getOneOrThrowSpy.mockRestore();
    });

    it('should return undefined if no matching endpoint is found', async () => {
      const getOneOrThrowSpy = jest
        .spyOn(projectService, 'getOneOrThrow')
        .mockResolvedValue(project);
      (resolveTokenProvider as jest.Mock).mockResolvedValue('resolved-token');
      (openopsTables.getMcpEndpointList as jest.Mock).mockResolvedValue([
        otherEndpoint,
      ]);

      const result = await projectService.getProjectMcpEndpoint(projectId);

      expect(result).toBeUndefined();
      getOneOrThrowSpy.mockRestore();
    });

    it('should return undefined if getOneOrThrow fails', async () => {
      const getOneOrThrowSpy = jest
        .spyOn(projectService, 'getOneOrThrow')
        .mockRejectedValue(new Error('Project not found'));

      const result = await projectService.getProjectMcpEndpoint(projectId);

      expect(result).toBeUndefined();
      getOneOrThrowSpy.mockRestore();
    });

    it('should return undefined if getMcpEndpointList fails', async () => {
      const getOneOrThrowSpy = jest
        .spyOn(projectService, 'getOneOrThrow')
        .mockResolvedValue(project);
      (resolveTokenProvider as jest.Mock).mockResolvedValue('resolved-token');
      (openopsTables.getMcpEndpointList as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch'),
      );

      const result = await projectService.getProjectMcpEndpoint(projectId);

      expect(result).toBeUndefined();
      getOneOrThrowSpy.mockRestore();
    });
  });
});
