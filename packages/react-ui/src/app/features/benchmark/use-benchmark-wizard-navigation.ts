import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import {
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { benchmarkApi } from './benchmark-api';

export type WizardPhase = 'initial' | 'provider-step';

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
  isNextDisabled: boolean;
  handleNextFromInitial: () => Promise<void>;
  handleNextFromProviderStep: () => Promise<void>;
  handlePrevious: () => void;
};

export const useBenchmarkWizardNavigation = (
  connectedProviders: Record<string, boolean>,
): UseBenchmarkWizardNavigationResult => {
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>('initial');
  const [currentStepResponse, setCurrentStepResponse] =
    useState<BenchmarkWizardStepResponse | null>(null);
  const [currentSelections, setCurrentSelections] = useState<string[]>([]);
  const [stepHistory, setStepHistory] = useState<StepHistoryEntry[]>([]);

  const { mutateAsync: fetchWizardStep, isPending: isLoadingStep } =
    useMutation({
      mutationFn: ({
        provider,
        request,
      }: {
        provider: string;
        request: BenchmarkWizardRequest;
      }) => benchmarkApi.getWizardStep(provider, request),
      onError: () => {
        toast(INTERNAL_ERROR_TOAST);
      },
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
    setCurrentSelections([]);
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

    const nextStepResponse = await fetchWizardStep({
      provider: selectedProvider,
      request: {
        currentStep: currentStepResponse.currentStep,
        benchmarkConfiguration: buildBenchmarkConfiguration(newHistory),
      },
    });

    setStepHistory(newHistory);
    setCurrentStepResponse(nextStepResponse);
    setCurrentSelections([]);
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

  const hasEmptyOptions =
    wizardPhase === 'provider-step' &&
    currentStepResponse?.options.length === 0;

  const isInitialNextDisabled = () =>
    !isSelectedProviderConnected || isLoadingStep;

  const isProviderStepNextDisabled = () =>
    (!hasEmptyOptions && currentSelections.length === 0) ||
    !currentStepResponse?.nextStep ||
    isLoadingStep;

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
    isNextDisabled,
    handleNextFromInitial,
    handleNextFromProviderStep,
    handlePrevious,
  };
};
