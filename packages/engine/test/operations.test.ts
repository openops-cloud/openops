import { EngineOperationType, EngineResponseStatus, ExecutionType, ActionType, StepOutputStatus, flowHelper, TriggerType } from '@openops/shared';
import { execute } from '../src/lib/operations';
import { blockHelper } from '../src/lib/helper/block-helper';
import { triggerHelper } from '../src/lib/helper/trigger-helper';
import { resolveVariable } from '../src/lib/resolve-variable';
import { flowExecutor } from '../src/lib/handler/flow-executor';
import { testExecutionContext } from '../src/lib/handler/context/test-execution-context';

jest.mock('../src/lib/helper/block-helper');
jest.mock('../src/lib/helper/trigger-helper');
jest.mock('../src/lib/resolve-variable');
jest.mock('../src/lib/handler/flow-executor');
jest.mock('../src/lib/handler/context/test-execution-context');
jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  flowHelper: {
    getStep: jest.fn(),
  },
}));

const mockBlockHelper = blockHelper as jest.Mocked<typeof blockHelper>;
const mockTriggerHelper = triggerHelper as jest.Mocked<typeof triggerHelper>;
const mockResolveVariable = resolveVariable as jest.Mocked<typeof resolveVariable>;
const mockFlowExecutor = flowExecutor as jest.Mocked<typeof flowExecutor>;
const mockTestExecutionContext = testExecutionContext as jest.Mocked<typeof testExecutionContext>;
const mockFlowHelper = flowHelper as jest.Mocked<typeof flowHelper>;

describe('Engine Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EXTRACT_BLOCK_METADATA operation', () => {
    it('should extract block metadata successfully', async () => {
      const mockMetadata = { version: '1.0.0', actions: [] };
      mockBlockHelper.extractBlockMetadata.mockResolvedValue(mockMetadata);

      const operation = {
        blockName: 'test-block',
        blockType: 'action',
        blockVersion: '1.0.0',
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockMetadata);
      expect(mockBlockHelper.extractBlockMetadata).toHaveBeenCalledWith({
        params: operation,
        blocksSource: expect.any(Object),
      });
    });

    it('should handle extraction errors gracefully', async () => {
      const errorMessage = 'Block not found';
      mockBlockHelper.extractBlockMetadata.mockRejectedValue(new Error(errorMessage));

      const operation = {
        blockName: 'non-existent-block',
        blockType: 'action',
        blockVersion: '1.0.0',
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('EXECUTE_FLOW operation', () => {
    const mockFlowVersion = {
      id: 'flow-version-1',
      flowId: 'flow-1',
      trigger: {
        name: 'trigger-1',
        type: ActionType.BLOCK,
      },
    };

    it('should execute flow with BEGIN execution type', async () => {
      const mockFlowResponse = { status: StepOutputStatus.SUCCEEDED, error: null };
      mockFlowExecutor.triggerFlowExecutor.mockResolvedValue(mockFlowResponse);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowRunId: 'run-1',
        flowVersion: mockFlowVersion,
        executionType: ExecutionType.BEGIN,
        triggerPayload: { data: 'test' },
        tasks: 0,
        steps: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_FLOW, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toEqual({
        status: mockFlowResponse.status,
        error: mockFlowResponse.error,
      });
    });

    it('should execute flow with RESUME execution type', async () => {
      const mockFlowResponse = { status: StepOutputStatus.SUCCEEDED, error: null };
      mockFlowExecutor.triggerFlowExecutor.mockResolvedValue(mockFlowResponse);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowRunId: 'run-1',
        flowVersion: mockFlowVersion,
        executionType: ExecutionType.RESUME,
        triggerPayload: {},
        tasks: 1,
        steps: {
          'step-1': {
            type: ActionType.BLOCK,
            status: StepOutputStatus.SUCCEEDED,
            output: { result: 'success' },
          },
        },
      };

      const result = await execute(EngineOperationType.EXECUTE_FLOW, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(mockFlowExecutor.triggerFlowExecutor).toHaveBeenCalled();
    });

    it('should handle flow execution errors', async () => {
      const errorMessage = 'Flow execution failed';
      mockFlowExecutor.triggerFlowExecutor.mockRejectedValue(new Error(errorMessage));

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowRunId: 'run-1',
        flowVersion: mockFlowVersion,
        executionType: ExecutionType.BEGIN,
        triggerPayload: {},
        tasks: 0,
        steps: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_FLOW, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('EXECUTE_PROPERTY operation', () => {
    it('should execute property operation successfully', async () => {
      const mockPropertyResult = { options: [{ label: 'Option 1', value: 'opt1' }] };
      mockBlockHelper.executeProps.mockResolvedValue(mockPropertyResult);
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        block: {
          blockName: 'test-block',
          blockType: 'action',
          blockVersion: '1.0.0',
        },
        propertyName: 'testProperty',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
        searchValue: 'test',
      };

      const result = await execute(EngineOperationType.EXECUTE_PROPERTY, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockPropertyResult);
      expect(mockBlockHelper.executeProps).toHaveBeenCalledWith({
        params: operation,
        blocksSource: expect.any(Object),
        executionState: expect.any(Object),
        searchValue: 'test',
        constants: expect.any(Object),
      });
    });

    it('should handle property execution errors', async () => {
      const errorMessage = 'Property execution failed';
      mockBlockHelper.executeProps.mockRejectedValue(new Error(errorMessage));
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        block: {
          blockName: 'test-block',
          blockType: 'action',
          blockVersion: '1.0.0',
        },
        propertyName: 'testProperty',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_PROPERTY, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('EXECUTE_STEP operation', () => {
    it('should execute step successfully', async () => {
      const mockStepOutput = {
        type: ActionType.BLOCK,
        status: StepOutputStatus.SUCCEEDED,
        output: { result: 'success' },
        input: { data: 'test' },
      };
      
      const mockExecutorOutput = {
        verdict: 'SUCCEEDED',
        steps: {
          'test-step': mockStepOutput,
        },
      };

      const mockExecutor = {
        handle: jest.fn().mockResolvedValue(mockExecutorOutput),
      };

      mockFlowExecutor.getExecutorForAction.mockReturnValue(mockExecutor);
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);
      mockFlowHelper.getStep.mockReturnValue({
        name: 'test-step',
        type: ActionType.BLOCK,
      });

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
          trigger: {
            name: 'trigger-1',
            type: TriggerType.EMPTY,
          },
          actions: [
            {
              name: 'test-step',
              type: ActionType.BLOCK,
            },
          ],
        },
        stepName: 'test-step',
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_STEP, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toEqual({
        success: true,
        output: mockStepOutput.output,
        input: mockStepOutput.input,
      });
    });

    it('should handle non-existent step', async () => {
      mockFlowHelper.getStep.mockReturnValue(undefined);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
          trigger: {
            name: 'trigger-1',
            type: TriggerType.EMPTY,
          },
          actions: [],
        },
        stepName: 'non-existent-step',
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_STEP, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe('Step not found or not supported');
    });

    it('should handle step execution errors', async () => {
      const errorMessage = 'Step execution failed';
      const mockExecutor = {
        handle: jest.fn().mockRejectedValue(new Error(errorMessage)),
      };

      mockFlowExecutor.getExecutorForAction.mockReturnValue(mockExecutor);
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);
      mockFlowHelper.getStep.mockReturnValue({
        name: 'test-step',
        type: ActionType.BLOCK,
      });

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
          trigger: {
            name: 'trigger-1',
            type: TriggerType.EMPTY,
          },
          actions: [
            {
              name: 'test-step',
              type: ActionType.BLOCK,
            },
          ],
        },
        stepName: 'test-step',
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_STEP, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('EXECUTE_TRIGGER_HOOK operation', () => {
    it('should execute trigger hook successfully', async () => {
      const mockTriggerResult = { webhookUrl: 'https://hook.test' };
      mockTriggerHelper.executeTrigger.mockResolvedValue(mockTriggerResult);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        hookType: 'WEBHOOK',
        triggerPayload: { data: 'test' },
      };

      const result = await execute(EngineOperationType.EXECUTE_TRIGGER_HOOK, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockTriggerResult);
      expect(mockTriggerHelper.executeTrigger).toHaveBeenCalledWith({
        params: operation,
        constants: expect.any(Object),
      });
    });

    it('should handle trigger execution errors', async () => {
      const errorMessage = 'Trigger execution failed';
      mockTriggerHelper.executeTrigger.mockRejectedValue(new Error(errorMessage));

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        hookType: 'WEBHOOK',
        triggerPayload: { data: 'test' },
      };

      const result = await execute(EngineOperationType.EXECUTE_TRIGGER_HOOK, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('EXECUTE_VALIDATE_AUTH operation', () => {
    it('should validate auth successfully', async () => {
      const mockAuthResult = { valid: true };
      mockBlockHelper.executeValidateAuth.mockResolvedValue(mockAuthResult);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        auth: {
          type: 'BEARER_TOKEN',
          token: 'test-token',
        },
      };

      const result = await execute(EngineOperationType.EXECUTE_VALIDATE_AUTH, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockAuthResult);
      expect(mockBlockHelper.executeValidateAuth).toHaveBeenCalledWith(operation);
    });

    it('should handle auth validation errors', async () => {
      const errorMessage = 'Auth validation failed';
      mockBlockHelper.executeValidateAuth.mockRejectedValue(new Error(errorMessage));

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        auth: {
          type: 'BEARER_TOKEN',
          token: 'invalid-token',
        },
      };

      const result = await execute(EngineOperationType.EXECUTE_VALIDATE_AUTH, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('RESOLVE_VARIABLE operation', () => {
    it('should resolve variable successfully', async () => {
      const mockResolvedValue = { value: 'resolved-value' };
      mockResolveVariable.mockResolvedValue(mockResolvedValue);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        variableName: 'test-variable',
        stepName: 'test-step',
      };

      const result = await execute(EngineOperationType.RESOLVE_VARIABLE, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockResolvedValue);
      expect(mockResolveVariable).toHaveBeenCalledWith(operation);
    });

    it('should handle variable resolution errors', async () => {
      const errorMessage = 'Variable resolution failed';
      mockResolveVariable.mockRejectedValue(new Error(errorMessage));

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
        },
        variableName: 'non-existent-variable',
      };

      const result = await execute(EngineOperationType.RESOLVE_VARIABLE, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('Unsupported operation type', () => {
    it('should handle unsupported operation type', async () => {
      const result = await execute('UNSUPPORTED_TYPE' as any, {});

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe('Unsupported operation type: UNSUPPORTED_TYPE');
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const errorMessage = '{"error": "parsed error"}';
      mockBlockHelper.extractBlockMetadata.mockRejectedValue(new Error(errorMessage));

      const operation = {
        blockName: 'test-block',
        blockType: 'action',
        blockVersion: '1.0.0',
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toEqual({ error: 'parsed error' });
    });

    it('should handle non-JSON error messages', async () => {
      const errorMessage = 'Simple error message';
      mockBlockHelper.extractBlockMetadata.mockRejectedValue(new Error(errorMessage));

      const operation = {
        blockName: 'test-block',
        blockType: 'action',
        blockVersion: '1.0.0',
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('cleanSampleData function', () => {
    it('should clean loop sample data correctly', async () => {
      const mockStepOutput = {
        type: ActionType.LOOP_ON_ITEMS,
        status: StepOutputStatus.SUCCEEDED,
        output: {
          item: 'test-item',
          index: 0,
          additionalData: 'should-be-removed',
        },
        input: { data: 'test' },
      };
      
      const mockExecutorOutput = {
        verdict: 'SUCCEEDED',
        steps: {
          'loop-step': mockStepOutput,
        },
      };

      const mockExecutor = {
        handle: jest.fn().mockResolvedValue(mockExecutorOutput),
      };

      mockFlowExecutor.getExecutorForAction.mockReturnValue(mockExecutor);
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);
      mockFlowHelper.getStep.mockReturnValue({
        name: 'loop-step',
        type: ActionType.LOOP_ON_ITEMS,
      });

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
          trigger: {
            name: 'trigger-1',
            type: TriggerType.EMPTY,
          },
          actions: [
            {
              name: 'loop-step',
              type: ActionType.LOOP_ON_ITEMS,
            },
          ],
        },
        stepName: 'loop-step',
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_STEP, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toEqual({
        success: true,
        output: {
          item: 'test-item',
          index: 0,
        },
        input: mockStepOutput.input,
      });
    });

    it('should return error message when present', async () => {
      const mockStepOutput = {
        type: ActionType.BLOCK,
        status: StepOutputStatus.FAILED,
        errorMessage: 'Step failed',
        output: { result: 'ignored' },
        input: { data: 'test' },
      };
      
      const mockExecutorOutput = {
        verdict: 'FAILED',
        steps: {
          'failed-step': mockStepOutput,
        },
      };

      const mockExecutor = {
        handle: jest.fn().mockResolvedValue(mockExecutorOutput),
      };

      mockFlowExecutor.getExecutorForAction.mockReturnValue(mockExecutor);
      mockTestExecutionContext.stateFromFlowVersion.mockResolvedValue({} as any);
      mockFlowHelper.getStep.mockReturnValue({
        name: 'failed-step',
        type: ActionType.BLOCK,
      });

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        flowVersion: {
          id: 'flow-version-1',
          flowId: 'flow-1',
          trigger: {
            name: 'trigger-1',
            type: TriggerType.EMPTY,
          },
          actions: [
            {
              name: 'failed-step',
              type: ActionType.BLOCK,
            },
          ],
        },
        stepName: 'failed-step',
        internalApiUrl: 'http://api.test',
        engineToken: 'token-123',
        stepTestOutputs: {},
      };

      const result = await execute(EngineOperationType.EXECUTE_STEP, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toEqual({
        success: false,
        output: 'Step failed',
        input: mockStepOutput.input,
      });
    });
  });
});