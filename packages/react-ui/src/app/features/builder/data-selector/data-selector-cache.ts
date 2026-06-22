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
  private readonly subscribers: Map<string, Set<() => void>> = new Map();

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
   * stepData is keyed by stepId (UUID); expanded nodes are keyed by stepName.
   */
  clearStep(stepId: string, stepName: string = stepId) {
    delete this.stepData[stepId];
    Object.keys(this.expandedNodes).forEach((key) => {
      if (key.startsWith(stepName)) {
        delete this.expandedNodes[key];
        this.notifySubscribers(key);
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
   * Set expanded state for a node and notify subscribers.
   */
  setExpanded(nodeKey: string, expanded: boolean) {
    if (this.getExpanded(nodeKey) === expanded) return;
    this.expandedNodes[nodeKey] = expanded;
    this.notifySubscribers(nodeKey);
  }

  /**
   * Subscribe to expanded state changes for a specific node key.
   * Returns an unsubscribe function.
   */
  subscribe(nodeKey: string, callback: () => void): () => void {
    if (!this.subscribers.has(nodeKey)) {
      this.subscribers.set(nodeKey, new Set());
    }
    this.subscribers.get(nodeKey)!.add(callback);
    return () => {
      const callbacks = this.subscribers.get(nodeKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(nodeKey);
        }
      }
    };
  }

  /**
   * Reset all expanded state for a step and notify affected subscribers.
   */
  resetExpandedForStep(stepId: string, stepName: string = stepId) {
    Object.keys(this.expandedNodes).forEach((key) => {
      if (key.startsWith(stepName)) {
        delete this.expandedNodes[key];
        this.notifySubscribers(key);
      }
    });
  }

  /**
   * Clear all cache and expanded state, notifying all subscribers.
   */
  clearAll() {
    this.stepData = {};
    this.expandedNodes = {};
    this.subscribers.forEach((callbacks) => callbacks.forEach((cb) => cb()));
  }

  private notifySubscribers(nodeKey: string) {
    this.subscribers.get(nodeKey)?.forEach((cb) => cb());
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
