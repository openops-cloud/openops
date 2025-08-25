import { QueryKeys } from '@/app/constants/query-keys';
import { formatUtils } from '@/app/lib/utils';
import { StepOutputWithData } from '@openops/shared';
import { QueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

export type StepOutputData = Omit<StepOutputWithData, 'input'>;

/**
 * StepTestOutputCache manages test output and expanded state for steps in the Data Selector.
 */
export class StepTestOutputCache {
  private stepData: Record<string, StepOutputData> = {};
  private expandedNodes: Record<string, boolean> = {};

  /**
   * Get cached test output for a step.
   */
  getStepData(stepId: string) {
    return this.stepData[stepId];
  }

  /**
   * Set test output for a step.
   */
  setStepData(stepId: string, data: StepOutputData) {
    this.stepData[stepId] = data;
  }

  /**
   * Clear all cached data and expanded state for a step.
   */
  clearStep(stepId: string) {
    delete this.stepData[stepId];
    // Remove expanded nodes for this step and its children
    Object.keys(this.expandedNodes).forEach((key) => {
      if (key.startsWith(stepId)) {
        delete this.expandedNodes[key];
      }
    });
  }

  /**
   * Get expanded state for a node.
   */
  getExpanded(nodeKey: string) {
    return !!this.expandedNodes[nodeKey];
  }

  /**
   * Set expanded state for a node.
   */
  setExpanded(nodeKey: string, expanded: boolean) {
    this.expandedNodes[nodeKey] = expanded;
  }

  /**
   * Reset all expanded state
   */
  resetExpandedForStep(stepId: string) {
    Object.keys(this.expandedNodes).forEach((key) => {
      if (key.startsWith(stepId)) {
        delete this.expandedNodes[key];
      }
    });
  }

  /**
   * Clear all cache and expanded state.
   */
  clearAll() {
    this.stepData = {};
    this.expandedNodes = {};
  }
}

export const stepTestOutputCache = new StepTestOutputCache();

/**
 * Utility to set step test output in both the cache and react-query client.
 */
export async function setStepOutputCache({
  stepId,
  flowVersionId,
  output,
  input,
  queryClient,
  success,
}: {
  stepId: string;
  flowVersionId: string;
  output: unknown;
  input: unknown;
  queryClient: QueryClient;
  success: boolean;
}) {
  const stepTestOutput: StepOutputData = {
    output: formatUtils.formatStepInputOrOutput(output),
    lastTestDate: dayjs().toISOString(),
    success,
  };

  stepTestOutputCache.setStepData(stepId, stepTestOutput);

  const queryKey = [QueryKeys.stepTestOutput, flowVersionId, stepId];
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(queryKey, {
    ...stepTestOutput,
    input: formatUtils.formatStepInputOrOutput(input),
  });
}
