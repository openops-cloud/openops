import { flowHelper } from '@openops/shared';
import { act, renderHook } from '@testing-library/react';
import { flagsHooks } from '../../../common/hooks/flags-hooks';
import { useBuilderStateContext } from '../builder-hooks';
import { useStepSettingsContext } from '../step-settings/step-settings-context';
import {
  stepTestOutputHooks,
  validateSampleDataSize,
} from '../test-step/step-test-output-hooks';

jest.mock('../step-settings/step-settings-context', () => ({
  useStepSettingsContext: jest.fn(),
}));

jest.mock('../builder-hooks', () => ({
  useBuilderStateContext: jest.fn(),
}));

jest.mock('../../../common/hooks/flags-hooks', () => ({
  flagsHooks: {
    useFlag: jest.fn(),
  },
}));

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  flowHelper: {
    isTrigger: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: jest.fn(
    (_, options) =>
      `Sample data is too large. The maximum allowed size is ${options?.maxKb} KB.`,
  ),
}));

const mockUseStepSettingsContext =
  useStepSettingsContext as jest.MockedFunction<typeof useStepSettingsContext>;
const mockUseBuilderStateContext =
  useBuilderStateContext as jest.MockedFunction<typeof useBuilderStateContext>;
const mockFlowHelper = flowHelper as jest.Mocked<typeof flowHelper>;
const mockApplyOperation = jest.fn();

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

const mockSetValue = jest.fn();
const mockForm = {
  setValue: mockSetValue,
} as any;

describe('stepTestOutputHooks.useSaveSelectedStepSampleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBuilderStateContext.mockReturnValue([mockApplyOperation]);
    mockUseStepSettingsContext.mockReturnValue({
      selectedStep: mockStep,
      selectedStepTemplateModel: null,
      blockModel: null,
    } as any);
    (flagsHooks.useFlag as jest.Mock).mockReturnValue({ data: 5 });
  });

  it('should return a function that can be called with sample data', () => {
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(mockForm),
    );

    expect(typeof result.current).toBe('function');
  });

  it('should handle Action step correctly', () => {
    const testSampleData = { newSample: 'action-data', count: 42 };
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(mockForm),
    );

    act(() => {
      result.current(testSampleData);
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'settings.inputUiInfo.sampleData',
      testSampleData,
      { shouldValidate: true },
    );
  });

  it('should handle Trigger step correctly', () => {
    const testSampleData = { newSample: 'trigger-data', enabled: true };
    mockFlowHelper.isTrigger.mockReturnValue(true);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(mockForm),
    );

    act(() => {
      result.current(testSampleData);
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'settings.inputUiInfo.sampleData',
      testSampleData,
      { shouldValidate: true },
    );
  });

  it('should update the sampleData property on the step', () => {
    const testSampleData = { test: 'new-sample-data' };
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(mockForm),
    );

    act(() => {
      result.current(testSampleData);
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'settings.inputUiInfo.sampleData',
      testSampleData,
      { shouldValidate: true },
    );
  });

  it('should handle null/undefined sample data', () => {
    mockFlowHelper.isTrigger.mockReturnValue(false);

    const { result } = renderHook(() =>
      stepTestOutputHooks.useSaveSelectedStepSampleData(mockForm),
    );

    act(() => {
      result.current(null);
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'settings.inputUiInfo.sampleData',
      null,
      { shouldValidate: true },
    );

    act(() => {
      result.current(undefined);
    });

    expect(mockSetValue).toHaveBeenCalledWith(
      'settings.inputUiInfo.sampleData',
      undefined,
      { shouldValidate: true },
    );
  });
});

describe('validateSampleDataSize', () => {
  const sizeLimitKb = 5;
  const expectedErrorMessage =
    'Sample data is too large. The maximum allowed size is 5 KB.';

  it.each([
    {
      name: 'should validate small object',
      sampleData: { key: 'value' },
      expected: { isValid: true },
    },
    {
      name: 'should validate valid json string',
      sampleData: JSON.stringify({ key: 'value' }),
      expected: { isValid: true },
    },
    {
      name: 'should reject large string',
      sampleData: 'x'.repeat(5 * 1024) + 'y',
      expected: {
        isValid: false,
        errorMessage: expectedErrorMessage,
      },
    },
    {
      name: 'should reject large json object',
      sampleData: JSON.stringify(
        Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`key${i}`, `value${i}`]),
        ),
      ),
      expected: {
        isValid: false,
        errorMessage: expectedErrorMessage,
      },
    },
    {
      name: 'should handle null input',
      sampleData: null,
      expected: { isValid: true },
    },
    {
      name: 'should handle undefined input',
      sampleData: undefined,
      expected: { isValid: true },
    },
    {
      name: 'should handle empty string',
      sampleData: '',
      expected: { isValid: true },
    },
  ])('$name', ({ sampleData, expected }) => {
    const result = validateSampleDataSize(sampleData, sizeLimitKb);

    expect(result.isValid).toBe(expected.isValid);
    if (expected.errorMessage) {
      expect(result.errorMessage).toBe(expected.errorMessage);
    }
  });
});
