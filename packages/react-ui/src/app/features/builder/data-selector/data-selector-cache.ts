import { StepOutputWithData } from '@openops/shared';

/**
 * StepTestOutputCache manages test output and expanded state for steps in the Data Selector.
 */
export class StepTestOutputCache {
  private stepData: Record<string, StepOutputWithData> = {};
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
  setStepData(stepId: string, data: StepOutputWithData) {
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
