import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictReason,
} from '../../src/lib/handler/context/flow-execution-context';
import { flowExecutor } from '../../src/lib/handler/flow-executor';
import {
  buildCodeAction,
  generateMockEngineConstants,
} from './test-helper';

jest.mock('../../src/lib/code-block/prepare-code-block.ts', () => ({
  prepareCodeBlock: jest.fn(),
}));

jest.mock('../../src/lib/services/storage.service', () => ({
  createContextStore: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
  })),
}));

jest.mock('../../src/lib/services/progress.service', () => ({
  progressService: {
    sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

describe('flowExecutor.executeFromAction', () => {
  it('should not update duration on the execution context', async () => {
    const action = buildCodeAction({
      name: 'echo_step',
      input: { key: '{{ 1 + 2 }}' },
    });

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.RUNNING);
    expect(result.duration).toBe(0);
  });

  it('should preserve existing duration without modifying it', async () => {
    const action = buildCodeAction({
      name: 'echo_step',
      input: { key: '{{ 1 + 2 }}' },
    });

    const existingContext = FlowExecutorContext.empty().updateDuration(5000);

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: existingContext,
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.RUNNING);
    expect(result.duration).toBe(5000);
  });

  it('should execute multiple chained actions without updating duration', async () => {
    const secondAction = buildCodeAction({
      name: 'echo_step_1',
      input: { key: '{{ echo_step }}' },
    });

    const firstAction = buildCodeAction({
      name: 'echo_step',
      input: { key: '{{ 1 + 2 }}' },
      nextAction: secondAction,
    });

    const result = await flowExecutor.executeFromAction({
      action: firstAction,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.RUNNING);
    expect(result.steps.echo_step).toBeDefined();
    expect(result.steps.echo_step_1).toBeDefined();
    expect(result.duration).toBe(0);
  });

  it('should stop execution when verdict is not RUNNING', async () => {
    const failingAction = buildCodeAction({
      name: 'runtime',
      input: {},
    });

    const unreachableAction = buildCodeAction({
      name: 'echo_step',
      input: { key: '{{ 1 + 2 }}' },
    });

    const action = buildCodeAction({
      name: 'runtime',
      input: {},
      nextAction: unreachableAction,
    });

    const result = await flowExecutor.executeFromAction({
      action: failingAction,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    expect(result.steps.echo_step).toBeUndefined();
    expect(result.duration).toBe(0);
  });

  it('should track step durations individually', async () => {
    const action = buildCodeAction({
      name: 'echo_step',
      input: { key: '{{ 1 + 2 }}' },
    });

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.steps.echo_step).toBeDefined();
    expect(result.steps.echo_step.duration).toBeGreaterThanOrEqual(0);
  });
});
