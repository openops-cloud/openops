import { ActionType, StepOutputStatus, FlowRunStatus, GenericStepOutput, LoopStepResult } from '@openops/shared';
import { FlowExecutorContext, ExecutionVerdict } from '../../src/lib/handler/context/flow-execution-context';
import { StepExecutionPath } from '../../src/lib/handler/context/step-execution-path';
import { loggingUtils } from '../../src/lib/helper/logging-utils';

jest.mock('../../src/lib/helper/logging-utils');

const mockLoggingUtils = loggingUtils as jest.Mocked<typeof loggingUtils>;

describe('FlowExecutorContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggingUtils.trimExecution.mockImplementation(async (steps) => steps);
  });

  describe('constructor and empty()', () => {
    it('should create empty context with default values', () => {
      const context = FlowExecutorContext.empty();

      expect(context.tasks).toBe(0);
      expect(context.tags).toEqual([]);
      expect(context.steps).toEqual({});
      expect(context.verdict).toBe(ExecutionVerdict.RUNNING);
      expect(context.verdictResponse).toBeUndefined();
      expect(context.error).toBeUndefined();
      expect(context.duration).toBe(-1);
      expect(context.pauseId).toBeTruthy();
      expect(context.currentPath).toBeDefined();
    });

    it('should create context from existing context', () => {
      const originalContext = FlowExecutorContext.empty()
        .increaseTask(5)
        .addTags(['tag1', 'tag2'])
        .setDuration(1000);

      const newContext = new FlowExecutorContext(originalContext);

      expect(newContext.tasks).toBe(5);
      expect(newContext.tags).toEqual(['tag1', 'tag2']);
      expect(newContext.duration).toBe(1000);
      expect(newContext.pauseId).toBe(originalContext.pauseId);
    });
  });

  describe('setPauseId', () => {
    it('should set pause ID correctly', () => {
      const context = FlowExecutorContext.empty();
      const newPauseId = 'test-pause-id';

      const updatedContext = context.setPauseId(newPauseId);

      expect(updatedContext.pauseId).toBe(newPauseId);
      expect(updatedContext).not.toBe(context);
    });
  });

  describe('increaseTask', () => {
    it('should increase task count by 1 by default', () => {
      const context = FlowExecutorContext.empty();

      const updatedContext = context.increaseTask();

      expect(updatedContext.tasks).toBe(1);
      expect(updatedContext).not.toBe(context);
    });

    it('should increase task count by specified amount', () => {
      const context = FlowExecutorContext.empty();

      const updatedContext = context.increaseTask(5);

      expect(updatedContext.tasks).toBe(5);
    });

    it('should accumulate task count', () => {
      const context = FlowExecutorContext.empty()
        .increaseTask(3)
        .increaseTask(2);

      expect(context.tasks).toBe(5);
    });
  });

  describe('addTags', () => {
    it('should add tags to empty context', () => {
      const context = FlowExecutorContext.empty();
      const tags = ['tag1', 'tag2'];

      const updatedContext = context.addTags(tags);

      expect(updatedContext.tags).toEqual(tags);
      expect(updatedContext).not.toBe(context);
    });

    it('should add tags to existing tags', () => {
      const context = FlowExecutorContext.empty()
        .addTags(['existing1', 'existing2']);

      const updatedContext = context.addTags(['new1', 'new2']);

      expect(updatedContext.tags).toEqual(['existing1', 'existing2', 'new1', 'new2']);
    });

    it('should deduplicate tags', () => {
      const context = FlowExecutorContext.empty()
        .addTags(['tag1', 'tag2']);

      const updatedContext = context.addTags(['tag2', 'tag3']);

      expect(updatedContext.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('setDuration', () => {
    it('should set duration correctly', () => {
      const context = FlowExecutorContext.empty();
      const duration = 5000;

      const updatedContext = context.setDuration(duration);

      expect(updatedContext.duration).toBe(duration);
      expect(updatedContext).not.toBe(context);
    });
  });

  describe('upsertStep', () => {
    it('should add new step to empty context', () => {
      const context = FlowExecutorContext.empty();
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      }).setOutput({ result: 'success' });

      const updatedContext = context.upsertStep(stepName, stepOutput);

      expect(updatedContext.steps[stepName]).toBe(stepOutput);
      expect(updatedContext).not.toBe(context);
    });

    it('should update existing step', () => {
      const stepName = 'test-step';
      const initialOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.RUNNING,
        input: { data: 'test' },
      });

      const updatedOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      }).setOutput({ result: 'success' });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, initialOutput);

      const updatedContext = context.upsertStep(stepName, updatedOutput);

      expect(updatedContext.steps[stepName]).toBe(updatedOutput);
      expect(updatedContext.steps[stepName].status).toBe(StepOutputStatus.SUCCEEDED);
    });

    it('should set error when step fails', () => {
      const context = FlowExecutorContext.empty();
      const stepName = 'failed-step';
      const failedOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.FAILED,
        input: { data: 'test' },
      });
      failedOutput.errorMessage = 'Step execution failed';

      const updatedContext = context.upsertStep(stepName, failedOutput);

      expect(updatedContext.error).toEqual({
        stepName,
        message: 'Step execution failed',
      });
    });

    it('should preserve existing error when step succeeds', () => {
      const initialError = { stepName: 'previous-failed', message: 'Previous error' };
      const baseContext = FlowExecutorContext.empty();
      const context = new FlowExecutorContext(baseContext);
      (context as any).error = initialError;

      const stepName = 'success-step';
      const successOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const updatedContext = context.upsertStep(stepName, successOutput);

      expect(updatedContext.error).toEqual(initialError);
    });
  });

  describe('getStepOutput', () => {
    it('should return step output when step exists', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      const result = context.getStepOutput(stepName);

      expect(result).toBe(stepOutput);
    });

    it('should return undefined when step does not exist', () => {
      const context = FlowExecutorContext.empty();

      const result = context.getStepOutput('non-existent-step');

      expect(result).toBeUndefined();
    });
  });

  describe('isCompleted', () => {
    it('should return true when step is completed', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      expect(context.isCompleted({ stepName })).toBe(true);
    });

    it('should return false when step is paused', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.PAUSED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      expect(context.isCompleted({ stepName })).toBe(false);
    });

    it('should return false when step does not exist', () => {
      const context = FlowExecutorContext.empty();

      expect(context.isCompleted({ stepName: 'non-existent' })).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return true when step is paused', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.PAUSED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      expect(context.isPaused({ stepName })).toBe(true);
    });

    it('should return false when step is not paused', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      expect(context.isPaused({ stepName })).toBe(false);
    });

    it('should return false when step does not exist', () => {
      const context = FlowExecutorContext.empty();

      expect(context.isPaused({ stepName: 'non-existent' })).toBe(false);
    });
  });

  describe('setStepDuration', () => {
    it('should set step duration when step exists', () => {
      const stepName = 'test-step';
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, stepOutput);

      const updatedContext = context.setStepDuration({
        stepName,
        duration: 1500,
      });

      expect(updatedContext.steps[stepName].duration).toBe(1500);
      expect(updatedContext).not.toBe(context);
    });

    it('should return same context when step does not exist', () => {
      const context = FlowExecutorContext.empty();

      const updatedContext = context.setStepDuration({
        stepName: 'non-existent',
        duration: 1500,
      });

      expect(updatedContext).toBe(context);
    });
  });

  describe('setCurrentPath', () => {
    it('should set current path correctly', () => {
      const context = FlowExecutorContext.empty();
      const newPath = new StepExecutionPath([['loop-step', 0]]);

      const updatedContext = context.setCurrentPath(newPath);

      expect(updatedContext.currentPath).toBe(newPath);
      expect(updatedContext).not.toBe(context);
    });
  });

  describe('setVerdict', () => {
    it('should set verdict without response', () => {
      const context = FlowExecutorContext.empty();

      const updatedContext = context.setVerdict(ExecutionVerdict.SUCCEEDED);

      expect(updatedContext.verdict).toBe(ExecutionVerdict.SUCCEEDED);
      expect(updatedContext.verdictResponse).toBeUndefined();
      expect(updatedContext).not.toBe(context);
    });

    it('should set verdict with response', () => {
      const context = FlowExecutorContext.empty();
      const response = {
        reason: FlowRunStatus.PAUSED as const,
        pauseMetadata: { 
          resumeDateTime: '2023-01-01T00:00:00Z',
          handlerId: 'test-handler',
          response: { pauseId: 'test-pause' }
        },
      };

      const updatedContext = context.setVerdict(ExecutionVerdict.PAUSED, response);

      expect(updatedContext.verdict).toBe(ExecutionVerdict.PAUSED);
      expect(updatedContext.verdictResponse).toBe(response);
    });
  });

  describe('getLoopStepOutput', () => {
    it('should return loop step output when step exists and is loop type', () => {
      const stepName = 'loop-step';
      const loopOutput = GenericStepOutput.create({
        type: ActionType.LOOP_ON_ITEMS,
        status: StepOutputStatus.SUCCEEDED,
        input: { items: ['a', 'b', 'c'] },
        output: {
          iterations: [],
          item: 'a',
          index: 0,
        } as LoopStepResult,
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, loopOutput);

      const result = context.getLoopStepOutput({ stepName });

      expect(result).toBeDefined();
      expect(result?.type).toBe(ActionType.LOOP_ON_ITEMS);
    });

    it('should return undefined when step does not exist', () => {
      const context = FlowExecutorContext.empty();

      const result = context.getLoopStepOutput({ stepName: 'non-existent' });

      expect(result).toBeUndefined();
    });

    it('should throw error when step is not a loop step', () => {
      const stepName = 'webhook-step';
      const webhookOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep(stepName, webhookOutput);

      expect(() => context.getLoopStepOutput({ stepName })).toThrow();
    });
  });

  describe('toResponse', () => {
    it('should convert SUCCEEDED verdict to response', async () => {
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.SUCCEEDED)
        .setDuration(2000)
        .increaseTask(3)
        .addTags(['tag1', 'tag2']);

      const response = await context.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.SUCCEEDED,
        duration: 2000,
        tasks: 3,
        tags: ['tag1', 'tag2'],
        steps: {},
      });
    });

    it('should convert FAILED verdict to response', async () => {
      const error = { stepName: 'failed-step', message: 'Error message' };
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.FAILED)
        .setDuration(1000);

      const contextWithError = new FlowExecutorContext(context);
      (contextWithError as any).error = error;

      const response = await contextWithError.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.FAILED,
        duration: 1000,
        tasks: 0,
        tags: [],
        steps: {},
        error,
      });
    });

    it('should convert PAUSED verdict to response', async () => {
      const pauseMetadata = { 
        resumeDateTime: '2023-01-01T00:00:00Z',
        handlerId: 'test-handler',
        response: { pauseId: 'test-pause' }
      };
      const verdictResponse = {
        reason: FlowRunStatus.PAUSED as const,
        pauseMetadata,
      };
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.PAUSED, verdictResponse)
        .setDuration(1500);

      const response = await context.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.PAUSED,
        duration: 1500,
        tasks: 0,
        tags: [],
        steps: {},
        pauseMetadata,
      });
    });

    it('should convert RUNNING verdict to response', async () => {
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.RUNNING)
        .setDuration(500);

      const response = await context.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.RUNNING,
        duration: 500,
        tasks: 0,
        tags: [],
        steps: {},
      });
    });

    it('should convert SUCCEEDED verdict with stop response', async () => {
      const stopResponse = { 
        status: 200,
        body: { message: 'Flow stopped' },
        headers: { 'Content-Type': 'application/json' }
      };
      const verdictResponse = {
        reason: FlowRunStatus.STOPPED as const,
        stopResponse,
      };
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.SUCCEEDED, verdictResponse)
        .setDuration(3000);

      const response = await context.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.SUCCEEDED,
        duration: 3000,
        tasks: 0,
        tags: [],
        steps: {},
        stopResponse,
      });
    });

    it('should convert FAILED verdict with internal error', async () => {
      const error = { stepName: 'error-step', message: 'Internal error' };
      const verdictResponse = {
        reason: FlowRunStatus.INTERNAL_ERROR as const,
      };
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.FAILED, verdictResponse)
        .setDuration(800);

      const contextWithError = new FlowExecutorContext(context);
      (contextWithError as any).error = error;

      const response = await contextWithError.toResponse();

      expect(response).toEqual({
        status: FlowRunStatus.INTERNAL_ERROR,
        duration: 800,
        tasks: 0,
        tags: [],
        steps: {},
        error,
      });
    });

    it('should throw error when PAUSED verdict lacks pause metadata', async () => {
      const context = FlowExecutorContext.empty()
        .setVerdict(ExecutionVerdict.PAUSED, { 
          reason: FlowRunStatus.STOPPED as const, 
          stopResponse: { 
            status: 200,
            body: {},
            headers: {}
          } 
        });

      await expect(context.toResponse()).rejects.toThrow(
        'Verdict Response should have pause metadata response'
      );
    });

    it('should call trimExecution on steps', async () => {
      const steps = {
        'step-1': GenericStepOutput.create({
          type: ActionType.BLOCK,
          status: StepOutputStatus.SUCCEEDED,
          input: { data: 'test' },
        }),
      };
      const context = FlowExecutorContext.empty()
        .upsertStep('step-1', steps['step-1'])
        .setVerdict(ExecutionVerdict.SUCCEEDED);

      await context.toResponse();

      expect(mockLoggingUtils.trimExecution).toHaveBeenCalledWith(steps);
    });
  });

  describe('currentState', () => {
    it('should return flattened step outputs', () => {
      const step1Output = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test1' },
      }).setOutput({ result: 'success1' });

      const step2Output = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test2' },
      }).setOutput({ result: 'success2' });

      const context = FlowExecutorContext.empty()
        .upsertStep('step-1', step1Output)
        .upsertStep('step-2', step2Output);

      const currentState = context.currentState();

      expect(currentState).toEqual({
        'step-1': { result: 'success1' },
        'step-2': { result: 'success2' },
      });
    });

    it('should handle loop iterations in current path', () => {
      const innerStepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'inner' },
      }).setOutput({ result: 'inner-success' });

      const loopOutput = GenericStepOutput.create({
        type: ActionType.LOOP_ON_ITEMS,
        status: StepOutputStatus.SUCCEEDED,
        input: { items: ['a', 'b'] },
        output: {
          iterations: [
            {
              'inner-step': innerStepOutput,
            },
          ],
          item: 'a',
          index: 0,
        } as LoopStepResult,
      });

      const context = FlowExecutorContext.empty()
        .upsertStep('loop-step', loopOutput)
        .setCurrentPath(new StepExecutionPath([['loop-step', 0]]));

      const currentState = context.currentState();

      // The currentState should contain both the loop-step output AND the flattened inner-step output
      expect(currentState['loop-step']).toEqual({
        iterations: [
          {
            'inner-step': innerStepOutput,
          },
        ],
        item: 'a',
        index: 0,
      });
      expect(currentState['inner-step']).toEqual({ result: 'inner-success' });
    });

    it('should throw error when path contains non-loop step', () => {
      const webhookOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      }).setOutput({ result: 'success' });

      const context = FlowExecutorContext.empty()
        .upsertStep('webhook-step', webhookOutput)
        .setCurrentPath(new StepExecutionPath([['webhook-step', 0]]));

      expect(() => context.currentState()).toThrow(
        '[ExecutionState#getTargetMap] Not instance of Loop On Items step output'
      );
    });
  });

  describe('immutability', () => {
    it('should not mutate original context when creating new context', () => {
      const originalContext = FlowExecutorContext.empty()
        .increaseTask(1)
        .addTags(['tag1']);

      const newContext = originalContext
        .increaseTask(2)
        .addTags(['tag2']);

      expect(originalContext.tasks).toBe(1);
      expect(originalContext.tags).toEqual(['tag1']);
      expect(newContext.tasks).toBe(3);
      expect(newContext.tags).toEqual(['tag1', 'tag2']);
    });

    it('should not mutate steps when upserting', () => {
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const originalContext = FlowExecutorContext.empty()
        .upsertStep('step-1', stepOutput);

      const newStepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.FAILED,
        input: { data: 'test2' },
      });

      const newContext = originalContext.upsertStep('step-2', newStepOutput);

      expect(Object.keys(originalContext.steps)).toEqual(['step-1']);
      expect(Object.keys(newContext.steps)).toEqual(['step-1', 'step-2']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty step name', () => {
      const context = FlowExecutorContext.empty();

      expect(context.isCompleted({ stepName: '' })).toBe(false);
      expect(context.isPaused({ stepName: '' })).toBe(false);
      expect(context.getStepOutput('')).toBeUndefined();
    });

    it('should handle undefined step output properties', () => {
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      });

      const context = FlowExecutorContext.empty()
        .upsertStep('test-step', stepOutput);

      expect(context.currentState()).toEqual({
        'test-step': undefined,
      });
    });

    it('should handle null values in step outputs', () => {
      const stepOutput = GenericStepOutput.create({
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        input: { data: 'test' },
      }).setOutput(null);

      const context = FlowExecutorContext.empty()
        .upsertStep('test-step', stepOutput);

      expect(context.currentState()).toEqual({
        'test-step': null,
      });
    });
  });
});