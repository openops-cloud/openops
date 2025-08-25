import { jest } from '@jest/globals';
import {
  ChatFlowContext,
  groupStepOutputsById,
  EngineResponseStatus,
  flowHelper,
  PopulatedFlow,
} from '@openops/shared';
import { engineRunner } from 'server-worker';

import {
  enrichContext,
  IncludeOptions,
} from '../../../src/app/ai/chat/context-enrichment.service';
import { accessTokenManager } from '../../../src/app/authentication/lib/access-token-manager';
import { flowService } from '../../../src/app/flows/flow/flow.service';
import { flowStepTestOutputService } from '../../../src/app/flows/step-test-output/flow-step-test-output.service';

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
  safeStringifyAndTruncate: jest.fn().mockImplementation((value) => {
    return JSON.stringify(value);
  }),
}));

jest.mock('../../../src/app/authentication/lib/access-token-manager', () => ({
  accessTokenManager: {
    generateEngineToken: jest.fn(),
  },
}));

jest.mock('../../../src/app/flows/flow/flow.service', () => ({
  flowService: {
    getOnePopulatedOrThrow: jest.fn(),
  },
}));

jest.mock(
  '../../../src/app/flows/step-test-output/flow-step-test-output.service',
  () => ({
    flowStepTestOutputService: {
      listEncrypted: jest.fn(),
      listDecrypted: jest.fn(),
    },
  }),
);

jest.mock('server-worker', () => ({
  engineRunner: {
    executeVariable: jest.fn(),
  },
}));

jest.mock('@openops/shared', () => ({
  flowHelper: {
    getAllStepIds: jest.fn(),
  },
  groupStepOutputsById: jest.fn(),
}));

const mockAccessTokenManager = accessTokenManager as jest.Mocked<
  typeof accessTokenManager
>;
const mockFlowService = flowService as jest.Mocked<typeof flowService>;
const mockFlowStepTestOutputService = flowStepTestOutputService as jest.Mocked<
  typeof flowStepTestOutputService
>;
const mockEngineRunner = engineRunner as jest.Mocked<typeof engineRunner>;
const mockFlowHelper = flowHelper as jest.Mocked<typeof flowHelper>;
const mockGroupStepOutputsById = groupStepOutputsById as jest.MockedFunction<
  typeof groupStepOutputsById
>;

describe('ContextEnrichmentService', () => {
  const mockProjectId = 'test-project-id';
  const mockFlowId = 'test-flow-id';
  const mockFlowVersionId = 'test-flow-version-id';
  const mockEngineToken = 'test-engine-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichContext', () => {
    const setupMockFlow = () => {
      const mockFlow = {
        version: {
          trigger: { id: 'trigger-id' },
        },
      } as PopulatedFlow;

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockGroupStepOutputsById.mockReturnValue({});

      return mockFlow;
    };

    const createMockInputContext = (): ChatFlowContext => ({
      flowId: mockFlowId,
      flowVersionId: mockFlowVersionId,
      steps: [
        {
          id: 'step-1',
          stepName: 'step_1',
          variables: [
            {
              name: 'variable1',
              value: '{{trigger.data}}',
            },
          ],
        },
      ],
    });

    it('should resolve variables and return enriched context', async () => {
      setupMockFlow();

      const mockInputContext = createMockInputContext();
      mockInputContext.steps[0].variables?.push({
        name: 'variable2',
        value: '{{step_2.output}}',
      });

      mockEngineRunner.executeVariable
        .mockResolvedValueOnce({
          status: 'OK' as EngineResponseStatus,
          result: {
            success: true,
            resolvedValue: { data: 'test-data' },
            censoredValue: { data: 'test-data' },
          },
        })
        .mockResolvedValueOnce({
          status: 'OK' as EngineResponseStatus,
          result: {
            success: true,
            resolvedValue: 'step-2-output',
            censoredValue: 'step-2-output',
          },
        });

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        currentStepId: undefined,
        currentStepData: '',
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: [
              {
                name: 'variable1',
                value: JSON.stringify({ data: 'test-data' }),
              },
              {
                name: 'variable2',
                value: JSON.stringify('step-2-output'),
              },
            ],
          },
        ],
      });

      expect(mockFlowService.getOnePopulatedOrThrow).toHaveBeenCalledWith({
        projectId: mockProjectId,
        id: mockFlowId,
        versionId: mockFlowVersionId,
      });

      expect(mockEngineRunner.executeVariable).toHaveBeenCalledTimes(2);
    });

    it('should handle steps without variables', async () => {
      const mockFlow = {
        version: {
          trigger: { id: 'trigger-id' },
        },
      } as PopulatedFlow;

      const mockInputContext = {
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
          },
        ],
      };

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockGroupStepOutputsById.mockReturnValue({});

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        currentStepId: undefined,
        currentStepData: '',
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: undefined,
          },
        ],
      });

      expect(mockEngineRunner.executeVariable).not.toHaveBeenCalled();
    });

    it('should handle variable resolution errors', async () => {
      const mockFlow = {
        version: {
          trigger: { id: 'trigger-id' },
        },
      } as PopulatedFlow;

      const mockInputContext = {
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: [
              {
                name: 'variable1',
                value: '{{invalid.variable}}',
              },
            ],
          },
        ],
      };

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockGroupStepOutputsById.mockReturnValue({});

      mockEngineRunner.executeVariable.mockResolvedValue({
        status: 'OK' as EngineResponseStatus,
        result: {
          success: false,
          resolvedValue: undefined,
          censoredValue: undefined,
          error: 'Variable not found',
        },
      });

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        currentStepId: undefined,
        currentStepData: '',
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: [
              {
                name: 'variable1',
                value: 'Variable not found',
              },
            ],
          },
        ],
      });
    });

    it('should handle engine runner exceptions', async () => {
      const mockFlow = {
        version: {
          trigger: { id: 'trigger-id' },
        },
      } as PopulatedFlow;

      const mockInputContext = {
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: [
              {
                name: 'variable1',
                value: '{{trigger.data}}',
              },
            ],
          },
        ],
      };

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockGroupStepOutputsById.mockReturnValue({});

      mockEngineRunner.executeVariable.mockRejectedValue(
        new Error('Engine error'),
      );

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        currentStepId: undefined,
        currentStepData: '',
        steps: [
          {
            id: 'step-1',
            stepName: 'step_1',
            variables: [
              {
                name: 'variable1',
                value: 'Error resolving variable: Engine error',
              },
            ],
          },
        ],
      });
    });

    it.each([
      {
        description: 'null values',
        inputValue: null,
        expectedOutput: 'null',
      },
      {
        description: 'undefined values',
        inputValue: undefined,
        expectedOutput: undefined,
      },
    ])('should handle $description', async ({ inputValue, expectedOutput }) => {
      setupMockFlow();
      const mockInputContext = createMockInputContext();

      mockEngineRunner.executeVariable.mockResolvedValue({
        status: 'OK' as EngineResponseStatus,
        result: {
          success: true,
          resolvedValue: inputValue,
          censoredValue: inputValue,
        },
      });

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result.steps[0]?.variables?.[0]?.value).toBe(expectedOutput);
    });

    it('should return empty steps when no steps provided', async () => {
      const mockInputContext = {
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [],
      };

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        currentStepId: undefined,
        currentStepData: '',
        steps: [],
      });
    });

    describe('getCurrentStepData functionality', () => {
      const mockCurrentStepId = 'current-step-id';

      beforeEach(() => {
        setupMockFlow();
      });

      it.each([
        {
          description:
            'should include current step data when includeCurrentStepOutput is ALWAYS',
          includeOption: IncludeOptions.ALWAYS,
          stepSuccess: true,
          stepOutput: { result: 'success', data: 'test-output' },
          expectedData: JSON.stringify({
            result: 'success',
            data: 'test-output',
          }),
          shouldCallService: true,
        },
        {
          description:
            'should not include current step data when includeCurrentStepOutput is NEVER',
          includeOption: IncludeOptions.NEVER,
          stepSuccess: true,
          stepOutput: { result: 'success', data: 'test-output' },
          expectedData: '',
          shouldCallService: true,
        },
        {
          description:
            'should not include current step data when no options provided (default behavior)',
          includeOption: undefined,
          stepSuccess: true,
          stepOutput: { result: 'success', data: 'test-output' },
          expectedData: '',
          shouldCallService: true,
        },
      ])(
        '$description',
        async ({
          includeOption,
          stepSuccess,
          stepOutput,
          expectedData,
          shouldCallService,
        }) => {
          const mockStepOutput = {
            id: 'output-id-1',
            created: '2023-01-01T00:00:00.000Z',
            updated: '2023-01-01T00:00:00.000Z',
            input: {},
            stepId: mockCurrentStepId,
            flowVersionId: mockFlowVersionId,
            output: stepOutput,
            success: stepSuccess,
          };

          mockFlowStepTestOutputService.listDecrypted.mockResolvedValue([
            mockStepOutput,
          ]);

          const mockInputContext = {
            ...createMockInputContext(),
            currentStepId: mockCurrentStepId,
          };

          const options = includeOption
            ? { includeCurrentStepOutput: includeOption }
            : undefined;
          const result = await enrichContext(
            mockInputContext,
            mockProjectId,
            options,
          );

          expect(result.currentStepId).toBe(mockCurrentStepId);
          expect(result.currentStepData).toBe(expectedData);

          if (shouldCallService) {
            expect(
              mockFlowStepTestOutputService.listDecrypted,
            ).toHaveBeenCalledWith({
              flowVersionId: mockFlowVersionId,
              stepIds: [mockCurrentStepId],
            });
          }
        },
      );

      it.each([
        {
          description:
            'should include current step data when includeCurrentStepOutput is ONLY_IF_ERROR and step failed',
          stepSuccess: false,
          stepOutput: { error: 'Something went wrong' },
          expectedData: JSON.stringify({ error: 'Something went wrong' }),
        },
        {
          description:
            'should not include current step data when includeCurrentStepOutput is ONLY_IF_ERROR and step succeeded',
          stepSuccess: true,
          stepOutput: { result: 'success', data: 'test-output' },
          expectedData: '',
        },
      ])('$description', async ({ stepSuccess, stepOutput, expectedData }) => {
        const mockStepOutput = {
          id: 'output-id-2',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          input: {},
          stepId: mockCurrentStepId,
          flowVersionId: mockFlowVersionId,
          output: stepOutput,
          success: stepSuccess,
        };

        mockFlowStepTestOutputService.listDecrypted.mockResolvedValue([
          mockStepOutput,
        ]);

        const mockInputContext = {
          ...createMockInputContext(),
          currentStepId: mockCurrentStepId,
        };

        const result = await enrichContext(mockInputContext, mockProjectId, {
          includeCurrentStepOutput: IncludeOptions.ONLY_IF_ERROR,
        });

        expect(result.currentStepId).toBe(mockCurrentStepId);
        expect(result.currentStepData).toBe(expectedData);
      });

      it('should return empty string when no current step output found', async () => {
        mockFlowStepTestOutputService.listDecrypted.mockResolvedValue([]);

        const mockInputContext = {
          ...createMockInputContext(),
          currentStepId: mockCurrentStepId,
        };

        const result = await enrichContext(mockInputContext, mockProjectId, {
          includeCurrentStepOutput: IncludeOptions.ALWAYS,
        });

        expect(result.currentStepId).toBe(mockCurrentStepId);
        expect(result.currentStepData).toBe('');
      });

      it('should not call listDecrypted when no currentStepId provided', async () => {
        const mockInputContext = createMockInputContext();

        const result = await enrichContext(mockInputContext, mockProjectId, {
          includeCurrentStepOutput: IncludeOptions.ALWAYS,
        });

        expect(result.currentStepId).toBeUndefined();
        expect(result.currentStepData).toBe('');
        expect(
          mockFlowStepTestOutputService.listDecrypted,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
