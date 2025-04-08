import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { t } from 'i18next';
import { useBuilderStateContext } from '../../builder-hooks';
import { useFlowVersionUndoRedo } from '../../flow-version-undo-redo/hooks/flow-version-undo-redo';
import { useLockAndPublish } from './lock-and-publish';

// Mock the useBuilderStateContext hook
jest.mock('../../builder-hooks', () => ({
  useBuilderStateContext: jest.fn(),
}));

// Mock the useClearUndoRedoHistory hook
jest.mock('../../flow-version-undo-redo/hooks/flow-version-undo-redo', () => ({
  useFlowVersionUndoRedo: jest.fn(),
}));

// Mock the useMutation hook
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

// Mock the flowsApi.update function
jest.mock('@/app/features/flows/lib/flows-api', () => ({
  flowsApi: {
    update: jest.fn(),
  },
}));

// Mock the toast function
jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
}));

// Mock the toast function
jest.mock('i18next', () => ({
  t: jest.fn(),
}));

describe('useLockAndPublish', () => {
  const mockUseBuilderStateContext = useBuilderStateContext as jest.Mock;
  const flowVersionUndoRedo = useFlowVersionUndoRedo as jest.Mock;
  const mockUseMutation = useMutation as jest.Mock;
  const mockFlowsApiUpdate = flowsApi.update as jest.Mock;
  const mockToast = toast as jest.Mock;
  const mockT = t as jest.Mock;

  let mockFlow: any;
  let mockSetFlow: jest.Mock;
  let mockSetVersion: jest.Mock;
  let mockClearUndoRedoHistory: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFlow = { id: 'flow-id', version: '1.0' };
    mockSetFlow = jest.fn();
    mockSetVersion = jest.fn();
    mockClearUndoRedoHistory = jest.fn();

    mockUseBuilderStateContext.mockImplementation((selector) =>
      selector({
        flow: mockFlow,
        setFlow: mockSetFlow,
        setVersion: mockSetVersion,
      }),
    );

    flowVersionUndoRedo.mockReturnValue({
      clearUndoRedoHistory: mockClearUndoRedoHistory,
    });

    mockUseMutation.mockImplementation(
      ({ mutationFn, onSuccess, onError }) => ({
        mutate: async () => {
          try {
            const result = await mutationFn();
            onSuccess(result);
          } catch (error) {
            onError(error);
          }
        },
        isPending: false,
      }),
    );

    mockFlowsApiUpdate.mockResolvedValue(mockFlow);
    mockToast.mockImplementation((obj) => obj);
    mockT.mockImplementation((key) => key);
  });

  it('should lock and publish successfully and clear undo/redo history', async () => {
    const { result } = renderHook(() => useLockAndPublish());

    await act(async () => {
      await result.current.mutatePublish();
    });

    expect(mockFlowsApiUpdate).toHaveBeenCalledWith(mockFlow.id, {
      type: 'LOCK_AND_PUBLISH',
      request: {},
    });
    expect(mockClearUndoRedoHistory).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Workflow has been published.',
      duration: 3000,
    });
    expect(mockSetFlow).toHaveBeenCalledWith(mockFlow);
    expect(mockSetVersion).toHaveBeenCalledWith(mockFlow.version);
  });

  it('should handle error during lock and publish', async () => {
    const mockError = new Error('Test error');
    mockFlowsApiUpdate.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useLockAndPublish());

    await act(async () => {
      await result.current.mutatePublish();
    });

    expect(mockFlowsApiUpdate).toHaveBeenCalledWith(mockFlow.id, {
      type: 'LOCK_AND_PUBLISH',
      request: {},
    });
    expect(mockToast).toHaveBeenCalledWith(INTERNAL_ERROR_TOAST);
  });

  it('should set isPublishingPending state correctly', async () => {
    mockUseMutation.mockImplementation(
      ({ mutationFn, onSuccess, onError }) => ({
        mutate: async () => {
          try {
            const result = await mutationFn();
            onSuccess(result);
          } catch (error) {
            onError(error);
          }
        },
        isPending: true,
      }),
    );

    const { result } = renderHook(() => useLockAndPublish());

    expect(result.current.isPublishingPending).toBe(true);
  });
});
