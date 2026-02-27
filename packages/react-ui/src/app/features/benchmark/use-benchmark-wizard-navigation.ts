import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import {
  BenchmarkCreationResult,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { benchmarkApi } from './benchmark-api';

export type WizardPhase = 'initial' | 'provider-step' | 'benchmark-ready';

type StepHistoryEntry = {
  stepResponse: BenchmarkWizardStepResponse;
  selections: string[];
};

const buildBenchmarkConfiguration = (
  history: StepHistoryEntry[],
): Record<string, string[]> =>
  history.reduce<Record<string, string[]>>((acc, entry) => {
    acc[entry.stepResponse.currentStep] = entry.selections;
    return acc;
  }, {});

type UseBenchmarkWizardNavigationResult = {
  selectedProvider: string | undefined;
  setSelectedProvider: (provider: string) => void;
  wizardPhase: WizardPhase;
  currentStepResponse: BenchmarkWizardStepResponse | null;
  currentSelections: string[];
  setCurrentSelections: (selections: string[]) => void;
  isLoadingStep: boolean;
  isCreatingBenchmark: boolean;
  benchmarkCreateResult: BenchmarkCreationResult | null;
  isNextDisabled: boolean;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
  handleEditSetup: () => void;
};

export const useBenchmarkWizardNavigation = (
  connectedProviders: Record<string, boolean>,
  onBenchmarkCreated?: (result: BenchmarkCreationResult) => void,
): UseBenchmarkWizardNavigationResult => {
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>('initial');
  const [currentStepResponse, setCurrentStepResponse] =
    useState<BenchmarkWizardStepResponse | null>(null);
  const [currentSelections, setCurrentSelections] = useState<string[]>([]);
  const [stepHistory, setStepHistory] = useState<StepHistoryEntry[]>([]);
  const [benchmarkCreateResult, setBenchmarkCreateResult] =
    useState<BenchmarkCreationResult | null>(null);

  const { mutateAsync: fetchWizardStep, isPending: isLoadingStep } =
    useMutation({
      mutationFn: ({
        provider,
        request,
      }: {
        provider: string;
        request: BenchmarkWizardRequest;
      }) => benchmarkApi.getWizardStep(provider, request),
      onError: handleMutationError,
    });

  const { mutateAsync: runCreateBenchmark, isPending: isCreatingBenchmark } =
    useMutation({
      mutationFn: ({
        provider,
        benchmarkConfiguration,
      }: {
        provider: string;
        benchmarkConfiguration: Record<string, string[]>;
      }) => benchmarkApi.createBenchmark(provider, benchmarkConfiguration),
      onSuccess: (result) => {
        setBenchmarkCreateResult(result);
        setWizardPhase('benchmark-ready');
        onBenchmarkCreated?.(result);
      },
      onError: handleMutationError,
    });

  const handleNextFromInitial = async () => {
    if (!selectedProvider) {
      return;
    }
    const stepResponse = await fetchWizardStep({
      provider: selectedProvider,
      request: {},
    });
    setCurrentStepResponse(stepResponse);
    setCurrentSelections(stepResponse.preselectedOptions ?? []);
    setStepHistory([]);
    setWizardPhase('provider-step');
  };

  const handleNextFromProviderStep = async () => {
    if (!currentStepResponse || !selectedProvider) {
      return;
    }
    const committed: StepHistoryEntry = {
      stepResponse: currentStepResponse,
      selections: currentSelections,
    };
    const newHistory = [...stepHistory, committed];
    const benchmarkConfiguration = buildBenchmarkConfiguration(newHistory);

    if (currentStepResponse.nextStep === null) {
      setStepHistory(newHistory);
      await runCreateBenchmark({
        provider: selectedProvider,
        benchmarkConfiguration,
      });
      return;
    }

    const nextStepResponse = await fetchWizardStep({
      provider: selectedProvider,
      request: {
        currentStep: currentStepResponse.currentStep,
        benchmarkConfiguration,
      },
    });

    setStepHistory(newHistory);
    setCurrentStepResponse(nextStepResponse);
    setCurrentSelections(nextStepResponse.preselectedOptions ?? []);
  };

  const handleEditSetup = () => {
    const lastEntry = stepHistory[stepHistory.length - 1];
    setStepHistory(stepHistory.slice(0, -1));
    setCurrentStepResponse(lastEntry.stepResponse);
    setCurrentSelections(lastEntry.selections);
    setWizardPhase('provider-step');
    setBenchmarkCreateResult(null);
  };

  const handlePrevious = () => {
    if (stepHistory.length === 0) {
      setWizardPhase('initial');
      setCurrentStepResponse(null);
      setCurrentSelections([]);
      return;
    }
    const previousEntry = stepHistory[stepHistory.length - 1];
    setStepHistory(stepHistory.slice(0, -1));
    setCurrentStepResponse(previousEntry.stepResponse);
    setCurrentSelections(previousEntry.selections);
  };

  const isSelectedProviderConnected =
    !!selectedProvider && connectedProviders[selectedProvider] === true;

  const isInitialNextDisabled = () =>
    !isSelectedProviderConnected || isLoadingStep;

  const isProviderStepNextDisabled = () =>
    currentSelections.length === 0 ||
    currentStepResponse?.nextStep === undefined ||
    isLoadingStep ||
    isCreatingBenchmark;

  const isNextDisabled =
    wizardPhase === 'initial'
      ? isInitialNextDisabled()
      : isProviderStepNextDisabled();

  return {
    selectedProvider,
    setSelectedProvider,
    wizardPhase,
    currentStepResponse,
    currentSelections,
    setCurrentSelections,
    isLoadingStep,
    isCreatingBenchmark,
    benchmarkCreateResult,
    isNextDisabled,
    handleNextFromInitial,
    handleNextFromProviderStep,
    handlePrevious,
    handleEditSetup,
  };
};
