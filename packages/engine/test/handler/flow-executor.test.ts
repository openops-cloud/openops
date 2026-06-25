import {
  ExecutionVerdict,
  FlowExecutorContext,
} from '../../src/lib/handler/context/flow-execution-context';
import { EngineConstants } from '../../src/lib/handler/context/engine-constants';
import { flowExecutor } from '../../src/lib/handler/flow-executor';
import {
  buildBlockAction,
  generateMockEngineConstants,
} from './test-helper';
import { FlowRunStatus, ProgressUpdateType, TriggerType } from '@openops/shared';
import { progressService } from '../../src/lib/services/progress.service';

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

function buildSuccessfulAction(name: string, nextAction?: any) {
  return buildBlockAction({
    name,
    blockName: '@openops/block-aws',
    actionName: 'build_arn',
    input: {
      auth: {},
      service: 's3',
      region: 'us-east-1',
      accountId: '123456789012',
      resourceId: 'mybucket/myobject',
    },
    nextAction,
  });
}

function buildFailingAction(name: string) {
  return buildBlockAction({
    name,
    blockName: '@openops/block-http',
    actionName: 'send_request',
    input: {
      url: 'http://localhost:1/nonexistent',
      method: 'GET',
      headers: {},
      body_type: 'none',
      body: {},
      queryParams: {},
    },
  });
}

function buildTrigger(nextAction?: any) {
  return {
    id: 'trigger',
    name: 'trigger',
    displayName: 'Test Trigger',
    type: TriggerType.EMPTY as const,
    settings: {},
    valid: true,
    nextAction,
  };
}

describe('flowExecutor.executeFromAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not update duration on the execution context', async () => {
    const action = buildSuccessfulAction('step1');

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.RUNNING);
    expect(result.duration).toBe(0);
  });

  it('should preserve existing duration without modifying it', async () => {
    const action = buildSuccessfulAction('step1');
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
    const secondAction = buildSuccessfulAction('step2');
    const firstAction = buildSuccessfulAction('step1', secondAction);

    const result = await flowExecutor.executeFromAction({
      action: firstAction,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.RUNNING);
    expect(result.steps.step1).toBeDefined();
    expect(result.steps.step2).toBeDefined();
    expect(result.duration).toBe(0);
  });

  it('should stop execution when verdict is FAILED', async () => {
    const unreachableAction = buildSuccessfulAction('step2');
    const action = buildFailingAction('step1');
    action.nextAction = unreachableAction;

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.verdict).toBe(ExecutionVerdict.FAILED);
    expect(result.steps.step2).toBeUndefined();
    expect(result.duration).toBe(0);
  });

  it('should track step durations individually', async () => {
    const action = buildSuccessfulAction('step1');

    const result = await flowExecutor.executeFromAction({
      action,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.steps.step1).toBeDefined();
    expect(result.steps.step1.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('flowExecutor.triggerFlowExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return SUCCEEDED status when flow completes successfully', async () => {
    const trigger = buildTrigger(buildSuccessfulAction('step1'));

    const result = await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.status).toBe(FlowRunStatus.SUCCEEDED);
    expect(result.steps.step1).toBeDefined();
  });

  it('should track total flow duration', async () => {
    const trigger = buildTrigger(buildSuccessfulAction('step1'));

    const result = await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.duration).toBeGreaterThan(0);
  });

  it('should accumulate duration with pre-existing duration', async () => {
    const trigger = buildTrigger(buildSuccessfulAction('step1'));
    const existingContext = FlowExecutorContext.empty().updateDuration(3000);

    const result = await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: existingContext,
      constants: generateMockEngineConstants(),
    });

    expect(result.duration).toBeGreaterThan(3000);
  });

  it('should return FAILED status when an action fails', async () => {
    const trigger = buildTrigger(buildFailingAction('step1'));

    const result = await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.status).toBe(FlowRunStatus.FAILED);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should send progress when executionCorrelationId is set', async () => {
    const trigger = buildTrigger(buildSuccessfulAction('step1'));

    await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants({
        executionCorrelationId: 'test-correlation-id',
        progressUpdateType: ProgressUpdateType.TEST_FLOW,
      }),
    });

    expect(progressService.sendUpdate).toHaveBeenCalled();
  });

  it('should not send final progress when executionCorrelationId is nil', async () => {
    const trigger = buildTrigger();
    const baseConstants = generateMockEngineConstants();

    const constantsWithNullCorrelation = new EngineConstants(
      null,
      baseConstants.flowId,
      baseConstants.flowName,
      baseConstants.flowVersionId,
      baseConstants.flowVersionState,
      baseConstants.flowRunId,
      baseConstants.publicUrl,
      baseConstants.internalApiUrl,
      baseConstants.retryConstants,
      baseConstants.engineToken,
      baseConstants.projectId,
      baseConstants.propsResolver,
      baseConstants.testSingleStepMode,
      baseConstants.filesServiceType,
      baseConstants.progressUpdateType,
      baseConstants.serverHandlerId,
      baseConstants.testRunActionLimits,
      baseConstants.isTestRun,
      baseConstants.tablesDatabaseId,
      baseConstants.tablesDatabaseToken,
      baseConstants.resumePayload,
    );

    await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: constantsWithNullCorrelation,
    });

    expect(progressService.sendUpdate).not.toHaveBeenCalled();
  });

  it('should return SUCCEEDED with empty steps when trigger has no nextAction', async () => {
    const trigger = buildTrigger();

    const result = await flowExecutor.triggerFlowExecutor({
      trigger,
      executionState: FlowExecutorContext.empty(),
      constants: generateMockEngineConstants(),
    });

    expect(result.status).toBe(FlowRunStatus.SUCCEEDED);
    expect(result.duration).toBeGreaterThan(0);
    expect(Object.keys(result.steps)).toHaveLength(0);
  });
});
