/* eslint-disable @typescript-eslint/no-explicit-any */
const mockInsert = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn().mockResolvedValue(undefined);
const mockGetRepository = jest.fn().mockReturnValue({ insert: mockInsert });
const mockTransaction = jest
  .fn()
  .mockImplementation(async (cb) =>
    cb({ getRepository: mockGetRepository, query: mockQuery }),
  );
const mockFlowRepo = jest.fn().mockReturnValue({
  manager: { transaction: mockTransaction },
});

jest.mock('../../../src/app/flows/flow/flow.repo', () => ({
  flowRepo: mockFlowRepo,
}));

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: jest.fn(),
  flowHelper: {
    getImportOperations: jest.fn().mockReturnValue([]),
    apply: jest.fn().mockImplementation((version) => version),
  },
}));

import {
  flowHelper,
  FlowStatus,
  FlowVersionState,
  openOpsId,
} from '@openops/shared';
import { bulkCreateAndPublishFlows } from '../../../src/app/flows/flow/flow-bulk-create';

const mockOpenOpsId = openOpsId as jest.Mock;
const mockGetImportOperations = flowHelper.getImportOperations as jest.Mock;
const mockApply = flowHelper.apply as jest.Mock;

const baseTemplate = {
  template: {
    displayName: 'Test Flow',
    trigger: { type: 'WEBHOOK', name: 'trigger' } as any,
  },
};

const baseConnections = [
  { id: 'conn-1', name: 'Test', authProviderKey: 'aws', supportedBlocks: [] },
] as any[];

describe('bulkCreateAndPublishFlows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetImportOperations.mockReturnValue([]);
    mockApply.mockImplementation((version) => version);

    let idCounter = 0;
    mockOpenOpsId.mockImplementation(() => `generated-id-${++idCounter}`);
  });

  it('returns empty array when templates is empty', async () => {
    const result = await bulkCreateAndPublishFlows(
      [],
      baseConnections,
      'project-1',
      'folder-1',
    );

    expect(result).toEqual([]);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('inserts flows and versions in a transaction', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockGetRepository).toHaveBeenCalledWith('flow');
    expect(mockGetRepository).toHaveBeenCalledWith('flow_version');
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('inserts flow with correct shape', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    const flowInsertCall = mockInsert.mock.calls[0][0];
    expect(flowInsertCall).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
        folderId: 'folder-1',
        status: FlowStatus.DISABLED,
        publishedVersionId: null,
        isInternal: false,
        schedule: null,
      }),
    ]);
  });

  it('inserts version with correct shape', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    const versionInsertCall = mockInsert.mock.calls[1][0];
    expect(versionInsertCall).toEqual([
      expect.objectContaining({
        displayName: 'Test Flow',
        state: FlowVersionState.LOCKED,
      }),
    ]);
  });

  it('runs bulk update SQL after inserts', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql: string = mockQuery.mock.calls[0][0];
    expect(sql).toContain('UPDATE flow');
    expect(sql).toContain('publishedVersionId');
  });

  it('sets status to ENABLED in the bulk update SQL params', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    const params: string[] = mockQuery.mock.calls[0][1];
    expect(params).toContain(FlowStatus.ENABLED);
  });

  it('returns one result per template with id and version', async () => {
    const result = await bulkCreateAndPublishFlows(
      [
        baseTemplate,
        {
          template: {
            displayName: 'Second',
            trigger: baseTemplate.template.trigger,
          },
        },
      ],
      baseConnections,
      'project-1',
      'folder-1',
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: expect.any(String),
      version: { id: expect.any(String), displayName: 'Test Flow' },
    });
    expect(result[1]).toEqual({
      id: expect.any(String),
      version: { id: expect.any(String), displayName: 'Second' },
    });
  });

  it('uses description from template when provided', async () => {
    await bulkCreateAndPublishFlows(
      [
        {
          template: {
            displayName: 'Flow',
            description: 'My desc',
            trigger: baseTemplate.template.trigger,
          },
        },
      ],
      baseConnections,
      'project-1',
      'folder-1',
    );

    const versionInsertCall = mockInsert.mock.calls[1][0];
    expect(versionInsertCall[0].description).toBe('My desc');
  });

  it('defaults description to empty string when not provided', async () => {
    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    const versionInsertCall = mockInsert.mock.calls[1][0];
    expect(versionInsertCall[0].description).toBe('');
  });

  it('applies import operations from flowHelper', async () => {
    const mockOp = { type: 'UPDATE_ACTION' };
    mockGetImportOperations.mockReturnValue([mockOp]);
    mockApply.mockImplementation((version) => ({
      ...version,
      displayName: 'mutated',
    }));

    await bulkCreateAndPublishFlows(
      [baseTemplate],
      baseConnections,
      'project-1',
      'folder-1',
    );

    expect(mockGetImportOperations).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WEBHOOK' }),
      baseConnections,
    );
    expect(mockApply).toHaveBeenCalledWith(expect.any(Object), mockOp);
  });
});
