// Utility for caching step test output and expanded state in the Data Selector
// This is a simple in-memory cache, can be replaced with context or other state management if needed

/**
 * StepTestOutputCache manages test output and expanded state for steps in the Data Selector.
 */
export class StepTestOutputCache {
  private stepData: Record<string, any> = {};
  private expandedNodes: Record<string, boolean> = {};
  private staleSteps: Set<string> = new Set();

  /**
   * Get cached test output for a step.
   */
  getStepData(stepId: string) {
    return this.stepData[stepId];
  }

  /**
   * Set test output for a step.
   */
  setStepData(stepId: string, data: any) {
    this.stepData[stepId] = data;
    this.staleSteps.delete(stepId);
  }

  /**
   * Mark a step as stale (needs refetch).
   */
  markStale(stepId: string) {
    this.staleSteps.add(stepId);
  }

  /**
   * Check if a step is stale.
   */
  isStale(stepId: string) {
    return this.staleSteps.has(stepId);
  }

  /**
   * Clear all cached data and expanded state for a step.
   */
  clearStep(stepId: string) {
    delete this.stepData[stepId];
    this.staleSteps.delete(stepId);
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
   * Reset all expanded state (e.g., when a step is re-tested).
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
    this.staleSteps.clear();
  }
}

export const stepTestOutputCache = new StepTestOutputCache();
