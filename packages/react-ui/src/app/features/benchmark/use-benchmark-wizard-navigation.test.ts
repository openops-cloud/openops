import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import { BenchmarkWizardStepResponse } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';

import { benchmarkApi } from './benchmark-api';
import { useBenchmarkWizardNavigation } from './use-benchmark-wizard-navigation';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

jest.mock('./benchmark-api', () => ({
  benchmarkApi: {
    getWizardStep: jest.fn(),
    createBenchmark: jest.fn(),
  },
}));

jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
  INTERNAL_ERROR_TOAST: { title: 'Error', description: 'Internal error' },
}));

const mockUseMutation = useMutation as jest.Mock;
const mockGetWizardStep = benchmarkApi.getWizardStep as jest.Mock;
const mockCreateBenchmark = benchmarkApi.createBenchmark as jest.Mock;
const mockToast = toast as jest.Mock;

const buildStepResponse = (
  overrides?: Partial<BenchmarkWizardStepResponse>,
): BenchmarkWizardStepResponse => ({
  currentStep: 'region',
  title: 'Select Region',
  description: 'Choose your cloud region',
  nextStep: 'instance-type',
  selectionType: 'single',
  options: [
    {
      id: 'us-east-1',
      displayName: 'US East 1',
      imageLogoUrl: '',
      metadata: {},
    },
  ],
  stepIndex: 0,
  totalSteps: 3,
  ...overrides,
});

const setupMutationMock = (isPending = false) => {
  mockUseMutation.mockImplementation(({ mutationFn, onError, onSuccess }) => ({
    mutateAsync: async (args: unknown) => {
      try {
        const result = await mutationFn(args);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError(error);
        throw error;
      }
    },
    isPending,
  }));
};

const connectedProviders: Record<string, boolean> = { aws: true, azure: false };

describe('useBenchmarkWizardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMutationMock();
  });

  describe('initial state', () => {
    it('should start in the initial phase with no step response', () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      expect(result.current.wizardPhase).toBe('initial');
      expect(result.current.currentStepResponse).toBeNull();
      expect(result.current.currentSelections).toEqual([]);
      expect(result.current.selectedProvider).toBeUndefined();
      expect(result.current.isLoadingStep).toBe(false);
    });

    it('should disable next when no provider is selected', () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      expect(result.current.isNextDisabled).toBe(true);
    });

    it('should disable next when selected provider is not connected', () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('azure');
      });

      expect(result.current.isNextDisabled).toBe(true);
    });

    it('should enable next when selected provider is connected', () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      expect(result.current.isNextDisabled).toBe(false);
    });

    it('should disable next when loading even with a connected provider', () => {
      setupMutationMock(true);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      expect(result.current.isNextDisabled).toBe(true);
    });
  });

  describe('handleNextFromInitial', () => {
    it('should do nothing when no provider is selected', async () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      await act(async () => {
        await result.current.handleNextFromInitial();
      });

      expect(mockGetWizardStep).not.toHaveBeenCalled();
      expect(result.current.wizardPhase).toBe('initial');
    });

    it('should fetch first wizard step and transition to provider-step phase', async () => {
      const stepResponse = buildStepResponse();
      mockGetWizardStep.mockResolvedValue(stepResponse);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      await act(async () => {
        await result.current.handleNextFromInitial();
      });

      expect(mockGetWizardStep).toHaveBeenCalledWith('aws', {});
      expect(result.current.wizardPhase).toBe('provider-step');
      expect(result.current.currentStepResponse).toEqual(stepResponse);
      expect(result.current.currentSelections).toEqual([]);
    });

    it('should reset selections and history when fetching first step', async () => {
      const firstStepResponse = buildStepResponse({ currentStep: 'region' });
      const secondStepResponse = buildStepResponse({
        currentStep: 'instance-type',
      });
      mockGetWizardStep
        .mockResolvedValueOnce(firstStepResponse)
        .mockResolvedValueOnce(secondStepResponse)
        .mockResolvedValueOnce(firstStepResponse);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      // Navigate forward twice to build up history
      await act(async () => {
        await result.current.handleNextFromInitial();
      });
      act(() => {
        result.current.setCurrentSelections(['us-east-1']);
      });
      await act(async () => {
        await result.current.handleNextFromProviderStep();
      });

      // Re-start from initial — should clear everything
      act(() => {
        result.current.setSelectedProvider('aws');
      });
      await act(async () => {
        await result.current.handleNextFromInitial();
      });

      expect(result.current.currentSelections).toEqual([]);
      expect(result.current.wizardPhase).toBe('provider-step');
    });

    it('should show error toast when API call fails', async () => {
      mockGetWizardStep.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      await act(async () => {
        await result.current.handleNextFromInitial().catch(() => undefined);
      });

      expect(mockToast).toHaveBeenCalledWith(INTERNAL_ERROR_TOAST);
      expect(result.current.wizardPhase).toBe('initial');
    });
  });

  describe('handleNextFromProviderStep', () => {
    it('should do nothing when there is no current step response', async () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });

      await act(async () => {
        await result.current.handleNextFromProviderStep();
      });

      expect(mockGetWizardStep).not.toHaveBeenCalled();
    });

    it('should fetch next step with correct configuration', async () => {
      const firstStep = buildStepResponse({
        currentStep: 'region',
        nextStep: 'instance-type',
      });
      const secondStep = buildStepResponse({
        currentStep: 'instance-type',
        nextStep: 'confirm',
        stepIndex: 1,
      });
      mockGetWizardStep
        .mockResolvedValueOnce(firstStep)
        .mockResolvedValueOnce(secondStep);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.setSelectedProvider('aws');
      });
      await act(async () => {
        await result.current.handleNextFromInitial();
      });

      act(() => {
        result.current.setCurrentSelections(['us-east-1']);
      });
      await act(async () => {
        await result.current.handleNextFromProviderStep();
      });

      expect(mockGetWizardStep).toHaveBeenNthCalledWith(2, 'aws', {
        currentStep: 'region',
        benchmarkConfiguration: { region: ['us-east-1'] },
      });
      expect(result.current.currentStepResponse).toEqual(secondStep);
      expect(result.current.currentSelections).toEqual([]);
    });

    it('should accumulate history across multiple steps', async () => {
      const regionStep = buildStepResponse({
        currentStep: 'region',
        nextStep: 'instance-type',
      });
      const instanceStep = buildStepResponse({
        currentStep: 'instance-type',
        nextStep: 'confirm',
        stepIndex: 1,
      });
      const confirmStep = buildStepResponse({
        currentStep: 'confirm',
        nextStep: null as unknown as string,
        stepIndex: 2,
      });
      mockGetWizardStep
        .mockResolvedValueOnce(regionStep)
        .mockResolvedValueOnce(instanceStep)
        .mockResolvedValueOnce(confirmStep);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => await result.current.handleNextFromProviderStep());

      act(() => result.current.setCurrentSelections(['t3.medium']));
      await act(async () => await result.current.handleNextFromProviderStep());

      expect(mockGetWizardStep).toHaveBeenNthCalledWith(3, 'aws', {
        currentStep: 'instance-type',
        benchmarkConfiguration: {
          region: ['us-east-1'],
          'instance-type': ['t3.medium'],
        },
      });
      expect(result.current.currentStepResponse).toEqual(confirmStep);
    });

    it('should show error toast when API call fails', async () => {
      const firstStep = buildStepResponse();
      mockGetWizardStep
        .mockResolvedValueOnce(firstStep)
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => {
        await result.current
          .handleNextFromProviderStep()
          .catch(() => undefined);
      });

      expect(mockToast).toHaveBeenCalledWith(INTERNAL_ERROR_TOAST);
    });
  });

  describe('handlePrevious', () => {
    it('should go back to initial phase when at the first provider step', async () => {
      const stepResponse = buildStepResponse();
      mockGetWizardStep.mockResolvedValue(stepResponse);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());
      expect(result.current.wizardPhase).toBe('provider-step');

      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.wizardPhase).toBe('initial');
      expect(result.current.currentStepResponse).toBeNull();
      expect(result.current.currentSelections).toEqual([]);
    });

    it('should restore the previous step and its selections from history', async () => {
      const firstStep = buildStepResponse({
        currentStep: 'region',
        nextStep: 'instance-type',
      });
      const secondStep = buildStepResponse({
        currentStep: 'instance-type',
        nextStep: 'confirm',
        stepIndex: 1,
      });
      mockGetWizardStep
        .mockResolvedValueOnce(firstStep)
        .mockResolvedValueOnce(secondStep);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => await result.current.handleNextFromProviderStep());
      expect(result.current.currentStepResponse).toEqual(secondStep);

      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.wizardPhase).toBe('provider-step');
      expect(result.current.currentStepResponse).toEqual(firstStep);
      expect(result.current.currentSelections).toEqual(['us-east-1']);
    });

    it('should do nothing on handlePrevious when already in initial phase', () => {
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.wizardPhase).toBe('initial');
      expect(result.current.currentStepResponse).toBeNull();
    });
  });

  describe('isNextDisabled in provider-step phase', () => {
    const setupAtProviderStep = async (
      stepResponse: BenchmarkWizardStepResponse,
    ) => {
      mockGetWizardStep.mockResolvedValue(stepResponse);
      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );
      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());
      return result;
    };

    it('should be disabled when no selections have been made and options exist', async () => {
      const result = await setupAtProviderStep(
        buildStepResponse({
          options: [
            { id: 'a', displayName: 'A', imageLogoUrl: '', metadata: {} },
          ],
          nextStep: 'next',
        }),
      );

      expect(result.current.isNextDisabled).toBe(true);
    });

    it('should be enabled when a selection is made and nextStep exists', async () => {
      const result = await setupAtProviderStep(
        buildStepResponse({ nextStep: 'next' }),
      );

      act(() => result.current.setCurrentSelections(['us-east-1']));

      expect(result.current.isNextDisabled).toBe(false);
    });

    it('should be enabled when nextStep is null and selections exist (last step triggers benchmark creation)', async () => {
      const result = await setupAtProviderStep(
        buildStepResponse({ nextStep: null as unknown as string }),
      );

      act(() => result.current.setCurrentSelections(['us-east-1']));

      expect(result.current.isNextDisabled).toBe(false);
    });

    it('should be disabled when options array is empty', async () => {
      const result = await setupAtProviderStep(
        buildStepResponse({ options: [], nextStep: 'next' }),
      );

      expect(result.current.isNextDisabled).toBe(true);
    });

    it('should be disabled when loading even with valid selections', async () => {
      setupMutationMock(true);
      const result = await setupAtProviderStep(
        buildStepResponse({ nextStep: 'next' }),
      );

      act(() => result.current.setCurrentSelections(['us-east-1']));

      expect(result.current.isNextDisabled).toBe(true);
    });
  });

  describe('creating benchmark (last step)', () => {
    const benchmarkResult = {
      benchmarkId: 'bm-1',
      folderId: 'folder-1',
      provider: 'aws',
      workflows: [],
      webhookPayload: {
        webhookBaseUrl: 'https://example.com',
        workflows: [],
        cleanupWorkflows: [],
        accounts: [],
        regions: [],
      },
    };

    it('should call createBenchmark and transition to benchmark-ready when nextStep is null', async () => {
      const lastStep = buildStepResponse({
        nextStep: null as unknown as string,
      });
      mockGetWizardStep.mockResolvedValue(lastStep);
      mockCreateBenchmark.mockResolvedValue(benchmarkResult);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => await result.current.handleNextFromProviderStep());

      expect(mockCreateBenchmark).toHaveBeenCalledWith('aws', {
        region: ['us-east-1'],
      });
      expect(result.current.wizardPhase).toBe('benchmark-ready');
      expect(result.current.createBenchmarkResult).toEqual(benchmarkResult);
    });

    it('should call onBenchmarkCreated callback with the result', async () => {
      const lastStep = buildStepResponse({
        nextStep: null as unknown as string,
      });
      mockGetWizardStep.mockResolvedValue(lastStep);
      mockCreateBenchmark.mockResolvedValue(benchmarkResult);
      const onBenchmarkCreated = jest.fn();

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders, onBenchmarkCreated),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => await result.current.handleNextFromProviderStep());

      expect(onBenchmarkCreated).toHaveBeenCalledWith(benchmarkResult);
    });

    it('should show error toast and stay in provider-step when createBenchmark fails', async () => {
      const lastStep = buildStepResponse({
        nextStep: null as unknown as string,
      });
      mockGetWizardStep.mockResolvedValue(lastStep);
      mockCreateBenchmark.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());

      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => {
        await result.current
          .handleNextFromProviderStep()
          .catch(() => undefined);
      });

      expect(mockToast).toHaveBeenCalledWith(INTERNAL_ERROR_TOAST);
      expect(result.current.wizardPhase).toBe('provider-step');
    });
  });

  describe('handleEditSetup', () => {
    it('should return to provider-step phase and clear createBenchmarkResult', async () => {
      const lastStep = buildStepResponse({
        nextStep: null as unknown as string,
      });
      const benchmarkResult = {
        benchmarkId: 'bm-1',
        folderId: 'folder-1',
        provider: 'aws',
        workflows: [],
        webhookPayload: {
          webhookBaseUrl: 'https://example.com',
          workflows: [],
          cleanupWorkflows: [],
          accounts: [],
          regions: [],
        },
      };
      mockGetWizardStep.mockResolvedValue(lastStep);
      mockCreateBenchmark.mockResolvedValue(benchmarkResult);

      const { result } = renderHook(() =>
        useBenchmarkWizardNavigation(connectedProviders),
      );

      act(() => result.current.setSelectedProvider('aws'));
      await act(async () => await result.current.handleNextFromInitial());
      act(() => result.current.setCurrentSelections(['us-east-1']));
      await act(async () => await result.current.handleNextFromProviderStep());
      expect(result.current.wizardPhase).toBe('benchmark-ready');

      act(() => result.current.handleEditSetup());

      expect(result.current.wizardPhase).toBe('provider-step');
      expect(result.current.createBenchmarkResult).toBeNull();
      expect(result.current.currentStepResponse).toEqual(lastStep);
      expect(result.current.currentSelections).toEqual(['us-east-1']);
    });
  });
});
