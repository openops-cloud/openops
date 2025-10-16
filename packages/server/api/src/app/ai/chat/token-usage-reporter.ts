import { logger } from '@openops/server-shared';
import { StepResult, ToolSet } from 'ai';

type AccumulatedUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
};

export class TokenUsageReporter {
  private readonly accumulatedUsage: AccumulatedUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  };

  private stepCount = 0;

  /**
   * Accumulates token usage from a single step
   */
  accumulateFromStep(result: StepResult<ToolSet>): void {
    this.stepCount++;

    if (result.usage) {
      this.accumulatedUsage.inputTokens += result.usage.inputTokens || 0;
      this.accumulatedUsage.outputTokens += result.usage.outputTokens || 0;
      this.accumulatedUsage.totalTokens += result.usage.totalTokens || 0;
      this.accumulatedUsage.cachedInputTokens +=
        result.usage.cachedInputTokens || 0;
    }
  }

  /**
   * Logs the accumulated token usage
   */
  logUsage(): void {
    logger.info('Total token usage for stream', {
      usage: this.accumulatedUsage,
      stepCount: this.stepCount,
    });
  }
}
