import { ContentType, type FolderDto } from '@openops/shared';
import {
  createBenchmark,
  ensureBenchmarkFolder,
  getBenchmarkFolderDisplayName,
} from '../../../src/app/benchmark/create-benchmark.service';
import { flowFolderService } from '../../../src/app/flows/folder/folder.service';

jest.mock('../../../src/app/flows/folder/folder.service', () => ({
  flowFolderService: {
    getOneByDisplayNameCaseInsensitive: jest.fn(),
    getOneOrThrow: jest.fn(),
    create: jest.fn(),
  },
}));

const flowFolderServiceMock = flowFolderService as jest.Mocked<
  typeof flowFolderService
>;

describe('create-benchmark.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns AWS Benchmark for aws provider (case-insensitive)', () => {
    expect(getBenchmarkFolderDisplayName('aws')).toBe('AWS Benchmark');
    expect(getBenchmarkFolderDisplayName('AWS')).toBe('AWS Benchmark');
  });

  it('throws validation error for unknown provider', () => {
    expect(() => getBenchmarkFolderDisplayName('gcp')).toThrow(
      'Unknown provider: gcp',
    );
  });

  it('returns existing folder when found by display name', async () => {
    const projectId = 'project-1';
    const displayName = 'AWS Benchmark';
    const existingFolder = {
      id: 'folder-1',
      projectId,
      displayName,
      contentType: ContentType.WORKFLOW,
      created: '',
      updated: '',
    };
    const folderDto: FolderDto = {
      id: 'folder-1',
      projectId,
      displayName,
      created: '',
      updated: '',
      numberOfFlows: 2,
      contentType: ContentType.WORKFLOW,
    };

    flowFolderServiceMock.getOneByDisplayNameCaseInsensitive.mockResolvedValue(
      existingFolder,
    );
    flowFolderServiceMock.getOneOrThrow.mockResolvedValue(folderDto);

    const result = await ensureBenchmarkFolder(projectId, displayName);

    expect(
      flowFolderServiceMock.getOneByDisplayNameCaseInsensitive,
    ).toHaveBeenCalledWith({
      projectId,
      displayName,
      contentType: ContentType.WORKFLOW,
    });
    expect(flowFolderServiceMock.getOneOrThrow).toHaveBeenCalledWith({
      projectId,
      folderId: 'folder-1',
    });
    expect(flowFolderServiceMock.create).not.toHaveBeenCalled();
    expect(result).toEqual(folderDto);
  });

  it('creates folder when display name not found', async () => {
    const projectId = 'project-1';
    const displayName = 'AWS Benchmark';
    const createdFolder: FolderDto = {
      id: 'folder-2',
      projectId,
      displayName,
      created: '',
      updated: '',
      numberOfFlows: 0,
      contentType: ContentType.WORKFLOW,
    };

    flowFolderServiceMock.getOneByDisplayNameCaseInsensitive.mockResolvedValue(
      null,
    );
    flowFolderServiceMock.create.mockResolvedValue(createdFolder);

    const result = await ensureBenchmarkFolder(projectId, displayName);

    expect(flowFolderServiceMock.getOneOrThrow).not.toHaveBeenCalled();
    expect(flowFolderServiceMock.create).toHaveBeenCalledWith({
      projectId,
      request: {
        displayName,
        contentType: ContentType.WORKFLOW,
      },
    });
    expect(result).toEqual(createdFolder);
  });

  it('creates a benchmark response after ensuring folder', async () => {
    const projectId = 'project-1';
    const displayName = 'AWS Benchmark';
    const createdFolder: FolderDto = {
      id: 'folder-2',
      projectId,
      displayName,
      created: '',
      updated: '',
      numberOfFlows: 0,
      contentType: ContentType.WORKFLOW,
    };

    flowFolderServiceMock.getOneByDisplayNameCaseInsensitive.mockResolvedValue(
      null,
    );
    flowFolderServiceMock.create.mockResolvedValue(createdFolder);

    const result = await createBenchmark({
      provider: 'aws',
      projectId,
    });

    expect(result.folderId).toBe(createdFolder.id);
    expect(result.workflows).toEqual([]);
    expect(result.benchmarkId).toBeDefined();
  });
});
