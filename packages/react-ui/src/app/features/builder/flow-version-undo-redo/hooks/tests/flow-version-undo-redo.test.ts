import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { toast } from '@openops/components/ui';
import { act, renderHook } from '@testing-library/react';
import { useBuilderStateContext } from '../../../builder-hooks';
import { useCenterWorkflowViewOntoStep } from '../../../hooks/center-workflow-view-onto-step';
import { REDO_ACTION, UNDO_ACTION } from '../../constants';
import { useFlowVersionUndoRedo } from '../flow-version-undo-redo';
import { useUndoRedoDB } from '../undo-redo-db';

jest.mock('../../../builder-hooks', () => ({
  useBuilderStateContext: jest.fn(),
}));

jest.mock('../../../hooks/center-workflow-view-onto-step', () => ({
  useCenterWorkflowViewOntoStep: jest.fn(),
}));

jest.mock('@/app/features/flows/lib/flows-api', () => ({
  flowsApi: {
    updateFlowVersion: jest.fn(),
  },
}));

jest.mock(
  '@/app/features/builder/flow-version-undo-redo/hooks/undo-redo-db',
  () => ({
    useUndoRedoDB: jest.fn(() => ({
      initializeUndoRedoDB: jest.fn(),
      bulkMoveAction: jest.fn(),
    })),
    UNDO_ACTION: 'UNDO_ACTION',
    REDO_ACTION: 'REDO_ACTION',
  }),
);

jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
  UNSAVED_CHANGES_TOAST: 'Unsaved changes',
}));

describe('useFlowVersionUndoRedo', () => {
  let mockFlowVersion: any;
  let mockSetVersion: jest.Mock;
  let mockCenterWorkflowViewOntoStep: jest.Mock;
  let mockSetVersionUpdateTimestamp: jest.Mock;
  let mockInitializeUndoRedoDB: jest.Mock;
  let mockBulkMoveAction: jest.Mock;
  let mockExitStepSettings: jest.Mock;

  beforeEach(() => {
    mockFlowVersion = {
      id: 'current-version',
      trigger: { name: 'current-trigger' },
      updated: 'timestamp',
      valid: true,
      flowId: 'flow-id',
    };
    mockSetVersion = jest.fn();
    mockSetVersionUpdateTimestamp = jest.fn();
    mockCenterWorkflowViewOntoStep = jest.fn();

    mockInitializeUndoRedoDB = jest.fn();
    mockBulkMoveAction = jest.fn();
    mockExitStepSettings = jest.fn();

    (useBuilderStateContext as jest.Mock).mockImplementation((selector) =>
      selector({
        flowVersion: mockFlowVersion,
        setVersion: mockSetVersion,
        canUndo: true,
        canRedo: false,
        setVersionUpdateTimestamp: mockSetVersionUpdateTimestamp,
        exitStepSettings: mockExitStepSettings,
      }),
    );

    (useCenterWorkflowViewOntoStep as jest.Mock).mockReturnValue(
      mockCenterWorkflowViewOntoStep,
    );
    (useUndoRedoDB as jest.Mock).mockReturnValue({
      initializeUndoRedoDB: mockInitializeUndoRedoDB,
      bulkMoveAction: mockBulkMoveAction,
    });
  });

  it('should initialize the undo/redo database', () => {
    renderHook(() => useFlowVersionUndoRedo());

    expect(mockInitializeUndoRedoDB).toHaveBeenCalledTimes(1);
    expect(mockExitStepSettings).not.toHaveBeenCalled();
  });

  it('should enqueue an undo action and process it correctly', async () => {
    mockBulkMoveAction.mockResolvedValueOnce({
      snapshot: { name: 'previous-trigger' },
      spotlightStepName: 'previous-step',
    });

    (flowsApi.updateFlowVersion as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'timestamp',
    });

    const { result } = renderHook(() => useFlowVersionUndoRedo());

    // Trigger undo
    await act(async () => {
      result.current.undo();
    });

    expect(mockBulkMoveAction).toHaveBeenCalledWith(
      [UNDO_ACTION],
      mockFlowVersion,
    );
    expect(mockSetVersion).toHaveBeenCalledWith({
      ...mockFlowVersion,
      trigger: { name: 'previous-trigger' },
    });
    expect(mockCenterWorkflowViewOntoStep).toHaveBeenCalledWith(
      'previous-step',
    );
    expect(mockExitStepSettings).toHaveBeenCalled();
  });

  it('should enqueue a redo action and process it correctly', async () => {
    mockBulkMoveAction.mockResolvedValueOnce({
      snapshot: { name: 'future-trigger' },
      spotlightStepName: 'future-step',
    });

    (flowsApi.updateFlowVersion as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'timestamp',
    });

    const { result } = renderHook(() => useFlowVersionUndoRedo());

    // Trigger redo
    await act(async () => {
      result.current.redo();
    });

    expect(mockBulkMoveAction).toHaveBeenCalledWith(
      [REDO_ACTION],
      mockFlowVersion,
    );
    expect(mockSetVersion).toHaveBeenCalledWith({
      ...mockFlowVersion,
      trigger: { name: 'future-trigger' },
    });
    expect(mockCenterWorkflowViewOntoStep).toHaveBeenCalledWith('future-step');
    expect(mockExitStepSettings).toHaveBeenCalled();
  });

  it('should handle API update failures gracefully', async () => {
    mockBulkMoveAction.mockResolvedValueOnce({
      snapshot: { name: 'failed-trigger' },
      spotlightStepName: 'failed-step',
    });
    (flowsApi.updateFlowVersion as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: 'Error',
    });

    const { result } = renderHook(() => useFlowVersionUndoRedo());

    // Trigger undo
    await act(async () => {
      result.current.undo();
    });

    expect(toast).toHaveBeenCalledWith('Unsaved changes');
    expect(mockExitStepSettings).toHaveBeenCalled();
  });

  it('should correctly report canUndo and canRedo states', () => {
    const { result } = renderHook(() => useFlowVersionUndoRedo());

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });
});
