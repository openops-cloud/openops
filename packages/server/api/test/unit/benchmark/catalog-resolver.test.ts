import fs from 'node:fs';
import { resolveWorkflowPathsForSeed } from '../../../src/app/benchmark/catalog-resolver';

const ORCHESTRATOR_WORKFLOW_ID = 'Orchestrator Workflow';
const CLEANUP_WORKFLOW_ID = 'Cleanup Workflow';
const SUB_WORKFLOW_ID = 'Sub Workflow A';

const TEST_PROVIDER = 'provider_a';

jest.mock('../../../src/app/benchmark/catalog-manifests', () => ({
  PROVIDER_LIFECYCLE_WORKFLOWS: {
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

  it('resolveWorkflowPathsForSeed throws when no sub-workflows', () => {
    expect(() => resolveWorkflowPathsForSeed(TEST_PROVIDER, [])).toThrow(
      'At least one sub-workflow is required',
    );
  });

  it('resolveWorkflowPathsForSeed throws when workflow file does not exist', () => {
    setCatalogExists((filePath) => {
      return (
        filePath.endsWith(`${ORCHESTRATOR_WORKFLOW_ID}.json`) ||
        filePath.endsWith(`${CLEANUP_WORKFLOW_ID}.json`)
      );
    });

    expect(() =>
      resolveWorkflowPathsForSeed(TEST_PROVIDER, [SUB_WORKFLOW_ID]),
    ).toThrow(`Workflow catalog file not found: ${SUB_WORKFLOW_ID}`);
  });

  it('resolveWorkflowPathsForSeed returns categorized workflows when all exist', () => {
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

    expect(result.orchestrator.id).toBe(ORCHESTRATOR_WORKFLOW_ID);
    expect(result.orchestrator.filePath).toContain(ORCHESTRATOR_WORKFLOW_ID);
    expect(result.cleanup.id).toBe(CLEANUP_WORKFLOW_ID);
    expect(result.cleanup.filePath).toContain(CLEANUP_WORKFLOW_ID);
    expect(result.subWorkflows).toHaveLength(1);
    expect(result.subWorkflows[0].id).toBe(SUB_WORKFLOW_ID);
    expect(
      result.subWorkflows[0].filePath.endsWith(`${SUB_WORKFLOW_ID}.json`),
    ).toBe(true);
  });
});
