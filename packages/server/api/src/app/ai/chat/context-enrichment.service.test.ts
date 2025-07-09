import { jest } from '@jest/globals';
import {
  encodeStepOutputs,
  EngineResponseStatus,
  flowHelper,
  PopulatedFlow,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../../app/authentication/lib/access-token-manager';
import { flowService } from '../../../app/flows/flow/flow.service';
import { flowStepTestOutputService } from '../../../app/flows/step-test-output/flow-step-test-output.service';
import { enrichContext } from './context-enrichment.service';

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../../app/authentication/lib/access-token-manager', () => ({
  accessTokenManager: {
    generateEngineToken: jest.fn(),
  },
}));

jest.mock('../../../app/flows/flow/flow.service', () => ({
  flowService: {
    getOnePopulatedOrThrow: jest.fn(),
  },
}));

jest.mock(
  '../../../app/flows/step-test-output/flow-step-test-output.service',
  () => ({
    flowStepTestOutputService: {
      listEncrypted: jest.fn(),
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
  encodeStepOutputs: jest.fn(),
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
const mockEncodeStepOutputs = encodeStepOutputs as jest.MockedFunction<
  typeof encodeStepOutputs
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
    it('should resolve variables and return enriched context', async () => {
      const mockFlow = {
        version: {
          trigger: {
            id: 'trigger-id',
            nextAction: {
              id: 'step-2',
              stepName: 'step_2',
            },
          },
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
              {
                name: 'variable2',
                value: '{{step_2.output}}',
              },
            ],
          },
        ],
      };

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1', 'step-2']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockEncodeStepOutputs.mockReturnValue({});

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
            stepName: 'Step 1',
          },
        ],
      };

      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
      mockAccessTokenManager.generateEngineToken.mockResolvedValue(
        mockEngineToken,
      );
      mockFlowHelper.getAllStepIds.mockReturnValue(['step-1']);
      mockFlowStepTestOutputService.listEncrypted.mockResolvedValue([]);
      mockEncodeStepOutputs.mockReturnValue({});

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [
          {
            id: 'step-1',
            stepName: 'Step 1',
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
            stepName: 'Step 1',
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
      mockEncodeStepOutputs.mockReturnValue({});

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
        steps: [
          {
            id: 'step-1',
            stepName: 'Step 1',
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
            stepName: 'Step 1',
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
      mockEncodeStepOutputs.mockReturnValue({});

      mockEngineRunner.executeVariable.mockRejectedValue(
        new Error('Engine error'),
      );

      const result = await enrichContext(mockInputContext, mockProjectId);

      expect(result).toEqual({
        flowId: mockFlowId,
        flowVersionId: mockFlowVersionId,
        steps: [
          {
            id: 'step-1',
            stepName: 'Step 1',
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
  });
});
