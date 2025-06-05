import { FlowOperationType, flowHelper } from '@openops/shared';
import { act, renderHook } from '@testing-library/react';
import { stepTestOutputHooks } from '../test-step/step-test-output-hooks';

import { useBuilderStateContext } from '../builder-hooks';
import { useStepSettingsContext } from '../step-settings/step-settings-context';

// Mock dependencies
jest.mock('../step-settings/step-settings-context', () => ({
  useStepSettingsContext: jest.fn(),
}));

jest.mock('../builder-hooks', () => ({
  useBuilderStateContext: jest.fn(),
}));

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  flowHelper: {
    isTrigger: jest.fn(),
  },
}));

const mockUseStepSettingsContext =
  useStepSettingsContext as jest.MockedFunction<typeof useStepSettingsContext>;
const mockUseBuilderStateContext =
  useBuilderStateContext as jest.MockedFunction<typeof useBuilderStateContext>;
const mockFlowHelper = flowHelper as jest.Mocked<typeof flowHelper>;
const mockApplyOperation = jest.fn();

// Minimal test data
const mockStep = {
  id: 'step-123',
  name: 'test-step',
  displayName: 'Test Step',
  type: 'CODE' as any,
  settings: {
    inputUiInfo: {},
  },
  valid: true,
};

describe('stepTestOutputHooks.useSaveSelectedStepSampleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBuilderStateContext.mockReturnValue([mockApplyOperation]);
    mockUseStepSettingsContext.mockReturnValue({
      selectedStep: mockStep,
      selectedStepTemplateModel: null,
      blockModel: null,
    } as any);
  });

  it('should return a function that can be called with sample data', () => {
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(),
    );

    expect(typeof result.current).toBe('function');
  });

  it('should handle Action step correctly', () => {
    const testSampleData = { newSample: 'action-data', count: 42 };
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(),
    );

    act(() => {
      result.current(testSampleData);
    });

    expect(mockFlowHelper.isTrigger).toHaveBeenCalledWith(mockStep.type);
    expect(mockApplyOperation).toHaveBeenCalledWith(
      {
        type: FlowOperationType.UPDATE_ACTION,
        request: expect.objectContaining({
          id: 'step-123',
          name: 'test-step',
        }),
      },
      expect.any(Function),
    );
  });

  it('should handle Trigger step correctly', () => {
    const testSampleData = { newSample: 'trigger-data', enabled: true };
    mockFlowHelper.isTrigger.mockReturnValue(true);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(),
    );

    act(() => {
      result.current(testSampleData);
    });

    expect(mockFlowHelper.isTrigger).toHaveBeenCalledWith(mockStep.type);
    expect(mockApplyOperation).toHaveBeenCalledWith(
      {
        type: FlowOperationType.UPDATE_TRIGGER,
        request: expect.objectContaining({
          id: 'step-123',
          name: 'test-step',
        }),
      },
      expect.any(Function),
    );
  });

  it('should update the sampleData property on the step', () => {
    const testSampleData = { test: 'new-sample-data' };
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(),
    );

    act(() => {
      result.current(testSampleData);
    });

    // Verify the request object contains the updated step with new sampleData
    const applyOperationCall = mockApplyOperation.mock.calls[0];
    const operationRequest = applyOperationCall[0];

    expect(operationRequest.request.settings.inputUiInfo.sampleData).toEqual(
      testSampleData,
    );
  });

  it('should handle null/undefined sample data', () => {
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(),
    );

    act(() => {
      result.current(null);
    });

    const applyOperationCall = mockApplyOperation.mock.calls[0];
    const operationRequest = applyOperationCall[0];

    expect(operationRequest.request.settings.inputUiInfo.sampleData).toBeNull();

    act(() => {
      result.current(undefined);
    });

    const secondCall = mockApplyOperation.mock.calls[1];
    const secondRequest = secondCall[0];

    expect(
      secondRequest.request.settings.inputUiInfo.sampleData,
    ).toBeUndefined();
  });
});
