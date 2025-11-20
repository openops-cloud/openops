import { resolveVariable } from '../src/lib/resolve-variable';
import { EngineConstants } from '../src/lib/handler/context/engine-constants';
import { testExecutionContext } from '../src/lib/handler/context/test-execution-context';
import { FlowExecutorContext } from '../src/lib/handler/context/flow-execution-context';
import { ResolveVariableOperation, TriggerType, FlowVersionState } from '@openops/shared';

jest.mock('../src/lib/handler/context/engine-constants');
jest.mock('../src/lib/handler/context/test-execution-context');

const mockEngineConstants = EngineConstants as jest.MockedClass<typeof EngineConstants>;
const mockTestExecutionContext = testExecutionContext as jest.Mocked<typeof testExecutionContext>;

describe('resolveVariable', () => {
  const mockInput: ResolveVariableOperation = {
    projectId: 'test-project-id',
    engineToken: 'test-engine-token',
    internalApiUrl: 'https://test-api.com',
    publicUrl: 'https://test-public.com',
    flowVersion: {
      id: 'flow-version-id',
      flowId: 'flow-id',
      displayName: 'Test Flow Version',
      valid: true,
      trigger: {
        id: 'trigger-id',
        name: 'trigger',
        displayName: 'Test Trigger',
        type: TriggerType.EMPTY,
        settings: {},
        valid: true,
        nextAction: undefined,
      },
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
      state: FlowVersionState.DRAFT,
      testRunActionLimits: {
        isEnabled: true,
        limits: [],
      },
    },
    stepName: 'test-step',
    variableExpression: '{{user.name}}',
    stepTestOutputs: {
      'step-id': {
        iv: 'iv',
        data: 'test-output',
      },
    },
  };

  const mockExecutionState = FlowExecutorContext.empty();

  const mockPropsResolver = {
    resolve: jest.fn(),
  };

  const mockConstants = {
    propsResolver: mockPropsResolver,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineConstants.fromExecuteStepInput = jest.fn().mockReturnValue(mockConstants);
    mockTestExecutionContext.stateFromFlowVersion = jest.fn().mockResolvedValue(mockExecutionState);
  });

  describe('success scenarios', () => {
    it.each([
      {
        description: 'string values',
        expression: '{{user.name}}',
        resolvedValue: 'John Doe',
        censoredValue: 'Jo** ***',
      },
      {
        description: 'numeric values',
        expression: '{{step1.output.result + step2.output.value}}',
        resolvedValue: 42,
        censoredValue: '42',
      },
      {
        description: 'null/undefined values',
        expression: '{{missing.value}}',
        resolvedValue: null,
        censoredValue: null,
      },
      {
        description: 'empty expressions',
        expression: '',
        resolvedValue: '',
        censoredValue: '',
      },
      {
        description: 'object values',
        expression: '{{user.profile}}',
        resolvedValue: { key: 'value', nested: { prop: 123 } },
        censoredValue: { key: 'value', nested: { prop: 123 } },
      },
      {
        description: 'array values',
        expression: '{{user.tags}}',
        resolvedValue: [1, 2, 3, 'string'],
        censoredValue: ['*', '*', '*', '*'],
      },
    ])('should resolve variable successfully with $description', async ({ expression, resolvedValue, censoredValue }) => {
      mockPropsResolver.resolve.mockResolvedValue({
        resolvedInput: resolvedValue,
        censoredInput: censoredValue,
      });

      const inputWithExpression = {
        ...mockInput,
        variableExpression: expression,
      };

      const result = await resolveVariable(inputWithExpression);

      expect(result).toEqual({
        success: true,
        resolvedValue,
        censoredValue,
      });

      expect(mockPropsResolver.resolve).toHaveBeenCalledWith({
        unresolvedInput: expression,
        executionState: mockExecutionState,
      });
    });

    it('should call all dependencies correctly', async () => {
      const mockResolvedValue = 'test-value';
      const mockCensoredValue = 'test-value';

      mockPropsResolver.resolve.mockResolvedValue({
        resolvedInput: mockResolvedValue,
        censoredInput: mockCensoredValue,
      });

      await resolveVariable(mockInput);

      expect(mockEngineConstants.fromExecuteStepInput).toHaveBeenCalledWith({
        projectId: mockInput.projectId,
        engineToken: mockInput.engineToken,
        internalApiUrl: mockInput.internalApiUrl,
        publicUrl: mockInput.publicUrl,
        flowVersion: mockInput.flowVersion,
        stepName: mockInput.stepName,
        stepTestOutputs: mockInput.stepTestOutputs,
      });

      expect(mockTestExecutionContext.stateFromFlowVersion).toHaveBeenCalledWith({
        apiUrl: mockInput.internalApiUrl,
        flowVersion: mockInput.flowVersion,
        excludedStepName: mockInput.stepName,
        projectId: mockInput.projectId,
        engineToken: mockInput.engineToken,
        stepTestOutputs: mockInput.stepTestOutputs,
      });
    });

    it('should work without stepTestOutputs', async () => {
      const mockResolvedValue = 'test-value';
      const mockCensoredValue = 'test-value';

      mockPropsResolver.resolve.mockResolvedValue({
        resolvedInput: mockResolvedValue,
        censoredInput: mockCensoredValue,
      });

      const inputWithoutStepTestOutputs = {
        ...mockInput,
        stepTestOutputs: undefined,
      };

      const result = await resolveVariable(inputWithoutStepTestOutputs);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe(mockResolvedValue);
      expect(result.censoredValue).toBe(mockCensoredValue);

      expect(mockEngineConstants.fromExecuteStepInput).toHaveBeenCalledWith({
        projectId: mockInput.projectId,
        engineToken: mockInput.engineToken,
        internalApiUrl: mockInput.internalApiUrl,
        publicUrl: mockInput.publicUrl,
        flowVersion: mockInput.flowVersion,
        stepName: mockInput.stepName,
        stepTestOutputs: undefined,
      });
    });
  });

  describe('error scenarios', () => {
    it.each([
      {
        description: 'EngineConstants creation failure',
        setupError: () => {
          (mockEngineConstants.fromExecuteStepInput as jest.Mock).mockImplementation(() => {
            throw new Error('Failed to create engine constants');
          });
        },
        expectedError: 'Failed to create engine constants',
        expectationsAfterError: () => {
          expect(mockTestExecutionContext.stateFromFlowVersion).not.toHaveBeenCalled();
          expect(mockPropsResolver.resolve).not.toHaveBeenCalled();
        },
      },
      {
        description: 'testExecutionContext.stateFromFlowVersion failure',
        setupError: () => {
          mockTestExecutionContext.stateFromFlowVersion.mockRejectedValue(new Error('Failed to create execution state'));
        },
        expectedError: 'Failed to create execution state',
        expectationsAfterError: () => {
          expect(mockEngineConstants.fromExecuteStepInput).toHaveBeenCalled();
          expect(mockPropsResolver.resolve).not.toHaveBeenCalled();
        },
      },
      {
        description: 'variableService.resolve failure',
        setupError: () => {
          mockPropsResolver.resolve.mockRejectedValue(new Error('Variable resolution failed'));
        },
        expectedError: 'Variable resolution failed',
        expectationsAfterError: () => {
          expect(mockEngineConstants.fromExecuteStepInput).toHaveBeenCalled();
          expect(mockTestExecutionContext.stateFromFlowVersion).toHaveBeenCalled();
        },
      },
    ])('should handle $description', async ({ setupError, expectedError, expectationsAfterError }) => {
      setupError();

      const result = await resolveVariable(mockInput);

      expect(result).toEqual({
        success: false,
        resolvedValue: null,
        censoredValue: null,
        error: expectedError,
      });

      expectationsAfterError();
    });

    it.each([
      {
        description: 'string errors',
        thrownError: 'String error',
        expectedError: 'String error',
      },
      {
        description: 'object errors without message',
        thrownError: { name: 'CustomError' },
        expectedError: '[object Object]',
      },
      {
        description: 'number errors',
        thrownError: 404,
        expectedError: '404',
      },
      {
        description: 'boolean errors',
        thrownError: false,
        expectedError: 'false',
      },
      {
        description: 'null errors',
        thrownError: null,
        expectedError: 'null',
      },
      {
        description: 'undefined errors',
        thrownError: undefined,
        expectedError: 'undefined',
      },
    ])('should handle non-Error thrown values: $description', async ({ thrownError, expectedError }) => {
      mockPropsResolver.resolve.mockRejectedValue(thrownError);

      const result = await resolveVariable(mockInput);

      expect(result).toEqual({
        success: false,
        resolvedValue: null,
        censoredValue: null,
        error: expectedError,
      });
    });
  });

  describe('edge cases', () => {
    it.each([
      {
        description: 'very long variable expressions',
        expression: '{{' + 'a'.repeat(10000) + '}}',
        resolvedValue: 'resolved-long-value',
        censoredValue: 'censored-long-value',
      },
      {
        description: 'special characters in variable expression',
        expression: '{{user["key-with-special-chars!@#$%^&*()"]}}',
        resolvedValue: 'special-value',
        censoredValue: 'sp*****-value',
      },
      {
        description: 'nested object access',
        expression: '{{user.profile.details.address.city}}',
        resolvedValue: 'New York',
        censoredValue: 'N** Y***',
      },
      {
        description: 'array index access',
        expression: '{{users[0].name}}',
        resolvedValue: 'First User',
        censoredValue: 'F**** U***',
      },
      {
        description: 'expressions with whitespace',
        expression: '{{ user.name }}',
        resolvedValue: 'User Name',
        censoredValue: 'U*** N***',
      },
    ])('should handle $description', async ({ expression, resolvedValue, censoredValue }) => {
      mockPropsResolver.resolve.mockResolvedValue({
        resolvedInput: resolvedValue,
        censoredInput: censoredValue,
      });

      const inputWithExpression = {
        ...mockInput,
        variableExpression: expression,
      };

      const result = await resolveVariable(inputWithExpression);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe(resolvedValue);
      expect(result.censoredValue).toBe(censoredValue);
    });
  });
});
