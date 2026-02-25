import fs from 'node:fs';
import {
  resolveWorkflowPaths,
  resolveWorkflowPathsForSeed,
} from '../../../src/app/benchmark/catalog-resolver';

const ORCHESTRATOR_WORKFLOW_ID = 'Orchestrator Workflow';
const CLEANUP_WORKFLOW_ID = 'Cleanup Workflow';
const SUB_WORKFLOW_ID = 'Sub Workflow A';

const TEST_PROVIDER = 'provider_a';

jest.mock('../../../src/app/benchmark/catalog-manifests', () => ({
  PROVIDER_CATALOG_MANIFESTS: {
    provider_a: {
      orchestratorWorkflowId: 'Orchestrator Workflow',
      cleanupWorkflowId: 'Cleanup Workflow',
    },
  },
}));

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
}));

const existsSyncMock = fs.existsSync as jest.MockedFunction<
  typeof fs.existsSync
>;

function setCatalogExists(workflowFilesExist: (path: string) => boolean): void {
  existsSyncMock.mockImplementation((filePath: fs.PathLike) => {
    const str = String(filePath);
    return workflowFilesExist(str);
  });
}

describe('catalog-resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveWorkflowPathsForSeed throws when provider is not in catalog', () => {
    expect(() => resolveWorkflowPathsForSeed('gcp', [])).toThrow(
      'Unsupported benchmark provider: gcp',
    );
  });

  it('resolveWorkflowPaths throws when workflow file does not exist', () => {
    existsSyncMock.mockReturnValue(false);

    expect(() =>
      resolveWorkflowPaths(TEST_PROVIDER, [SUB_WORKFLOW_ID]),
    ).toThrow(`Workflow catalog file not found: ${SUB_WORKFLOW_ID}`);
  });

  it('resolveWorkflowPaths returns empty array for empty workflowIds', () => {
    const result = resolveWorkflowPaths(TEST_PROVIDER, []);
    expect(result).toEqual([]);
  });

  it('resolveWorkflowPathsForSeed returns orchestrator, cleanup, then sub-workflows when all exist', () => {
    setCatalogExists((filePath) => {
      return (
        filePath.endsWith(`${ORCHESTRATOR_WORKFLOW_ID}.json`) ||
        filePath.endsWith(`${CLEANUP_WORKFLOW_ID}.json`) ||
        filePath.endsWith(`${SUB_WORKFLOW_ID}.json`)
      );
    });

    const result = resolveWorkflowPathsForSeed(TEST_PROVIDER, [
      SUB_WORKFLOW_ID,
    ]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(ORCHESTRATOR_WORKFLOW_ID);
    expect(result[0].filePath).toContain(ORCHESTRATOR_WORKFLOW_ID);
    expect(result[1].id).toBe(CLEANUP_WORKFLOW_ID);
    expect(result[1].filePath).toContain(CLEANUP_WORKFLOW_ID);
    expect(result[2].id).toBe(SUB_WORKFLOW_ID);
    expect(result[2].filePath.endsWith(`${SUB_WORKFLOW_ID}.json`)).toBe(true);
  });
});
