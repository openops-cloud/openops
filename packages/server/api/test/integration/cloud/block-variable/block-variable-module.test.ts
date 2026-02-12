const commonMock = {
  ...jest.requireActual('@openops/common'),
  authenticateOpenOpsAnalyticsAdmin: jest.fn(),
};
jest.mock('@openops/common', () => commonMock);

const flowServiceMock = {
  getOnePopulatedOrThrow: jest.fn(),
  getAllEnabled: jest.fn(),
};
jest.mock('../../../../src/app/flows/flow/flow.service', () => ({
  flowService: flowServiceMock,
}));

const flowVersionServiceMock = {
  getOneOrThrow: jest.fn(),
};
jest.mock(
  '../../../../src/app/flows/flow-version/flow-version.service',
  () => ({
    flowVersionService: flowVersionServiceMock,
  }),
);

const accessTokenManagerMock = {
  generateEngineToken: jest.fn(),
  generateWorkerToken: jest.fn(),
  extractPrincipal: jest.fn(),
};
jest.mock(
  '../../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: accessTokenManagerMock,
  }),
);

const flowStepTestOutputServiceMock = {
  listEncrypted: jest.fn(),
};
jest.mock(
  '../../../../src/app/flows/step-test-output/flow-step-test-output.service',
  () => ({
    flowStepTestOutputService: flowStepTestOutputServiceMock,
  }),
);

const engineRunnerMock = {
  executeVariable: jest.fn(),
};
const flowWorkerMock = {
  init: jest.fn(),
  close: jest.fn(),
  start: jest.fn(),
};
jest.mock('server-worker', () => ({
  engineRunner: engineRunnerMock,
  flowWorker: flowWorkerMock,
}));

const triggerUtilsMock = {
  getBlockTrigger: jest.fn(),
};
jest.mock('../../../../src/app/flows/trigger/hooks/trigger-utils', () => ({
  triggerUtils: triggerUtilsMock,
}));

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  blocksBuilder: jest.fn(),
}));

import { blocksBuilder } from '@openops/server-shared';
import { PrincipalType } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  flowServiceMock.getAllEnabled.mockResolvedValue([]);
  flowVersionServiceMock.getOneOrThrow.mockResolvedValue({
    id: 'mock-version-id',
    trigger: {
      id: 'trigger-id',
      type: 'webhook',
      name: 'trigger',
      settings: {},
      nextAction: undefined,
    },
  });
  accessTokenManagerMock.generateWorkerToken.mockResolvedValue(
    'mock-worker-token',
  );
  accessTokenManagerMock.extractPrincipal.mockResolvedValue({
    id: 'test-user-id',
    type: PrincipalType.USER,
    projectId: 'test-project-id',
    organization: {
      id: 'test-org-id',
    },
  });
  flowWorkerMock.init.mockResolvedValue(undefined);
  flowWorkerMock.close.mockResolvedValue(undefined);
  flowWorkerMock.start.mockResolvedValue(undefined);
  triggerUtilsMock.getBlockTrigger.mockResolvedValue(null);
  (blocksBuilder as jest.Mock).mockResolvedValue(undefined);

  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('POST /v1/block-variable/execute-variable', () => {
  const mockFlow = {
    version: {
      trigger: {
        id: 'trigger-id',
        name: 'trigger',
        type: 'webhook',
        settings: {},
        nextAction: undefined,
      },
    },
  };

  const mockEngineToken = 'mock-engine-token';
  const mockStepOutputs: unknown[] = [];
  const mockVariableResult = {
    success: true,
    censoredValue: 'test-value',
    error: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    flowServiceMock.getOnePopulatedOrThrow.mockResolvedValue(mockFlow);
    flowServiceMock.getAllEnabled.mockResolvedValue([]);
    flowVersionServiceMock.getOneOrThrow.mockResolvedValue({
      id: 'mock-version-id',
      trigger: {
        id: 'trigger-id',
        type: 'webhook',
        name: 'trigger',
        settings: {},
        nextAction: undefined,
      },
    });
    accessTokenManagerMock.generateEngineToken.mockResolvedValue(
      mockEngineToken,
    );
    accessTokenManagerMock.extractPrincipal.mockResolvedValue({
      id: 'test-user-id',
      type: PrincipalType.USER,
      projectId: 'test-project-id',
      organization: {
        id: 'test-org-id',
      },
    });
    flowStepTestOutputServiceMock.listEncrypted.mockResolvedValue(
      mockStepOutputs,
    );
    engineRunnerMock.executeVariable.mockResolvedValue({
      result: mockVariableResult,
    });
    triggerUtilsMock.getBlockTrigger.mockResolvedValue(null);
  });

  const createMockToken = async (): Promise<string> =>
    generateMockToken({
      type: PrincipalType.USER,
      projectId: 'test-project-id',
    });

  const makeRequest = async ({
    method = 'POST',
    url = '/v1/block-variable/execute-variable',
    token,
    body,
  }: {
    method?: 'POST';
    url?: string;
    token?: string;
    body?: Record<string, unknown>;
  }) => {
    return app?.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      payload: body,
    });
  };

  it('should require authentication', async () => {
    const response = await makeRequest({
      body: {
        flowId: 'test-flow-id',
        flowVersionId: 'test-version-id',
        variableExpression: '{{trigger.headers}}',
      },
    });

    expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  it('should successfully execute variable resolution', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
      stepName: 'test-step',
    };

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual({
      success: true,
      value: 'test-value',
      error: '',
    });

    expect(flowServiceMock.getOnePopulatedOrThrow).toHaveBeenCalledWith({
      projectId: 'test-project-id',
      id: requestBody.flowId,
      versionId: requestBody.flowVersionId,
    });

    expect(accessTokenManagerMock.generateEngineToken).toHaveBeenCalledWith({
      projectId: 'test-project-id',
    });

    expect(flowStepTestOutputServiceMock.listEncrypted).toHaveBeenCalledWith({
      flowVersionId: requestBody.flowVersionId,
      stepIds: ['trigger-id'],
    });

    expect(engineRunnerMock.executeVariable).toHaveBeenCalledWith(
      mockEngineToken,
      {
        variableExpression: requestBody.variableExpression,
        flowVersion: mockFlow.version,
        projectId: 'test-project-id',
        stepName: requestBody.stepName,
        stepTestOutputs: {},
      },
    );
  });

  it('should work without optional stepName', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual({
      success: true,
      value: 'test-value',
      error: '',
    });

    expect(engineRunnerMock.executeVariable).toHaveBeenCalledWith(
      mockEngineToken,
      expect.objectContaining({
        stepName: '',
      }),
    );
  });

  it('should return error when variable resolution fails', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{invalid.expression}}',
    };

    const mockErrorResult = {
      success: false,
      censoredValue: null,
      error: 'Variable resolution failed',
    };

    engineRunnerMock.executeVariable.mockResolvedValue({
      result: mockErrorResult,
    });

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual({
      success: false,
      value: null,
      error: 'Variable resolution failed',
    });
  });

  it('should return 500 when flow service throws an error', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'non-existent-flow',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    flowServiceMock.getOnePopulatedOrThrow.mockRejectedValue(
      new Error('Flow not found'),
    );

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it('should return 500 when engine token generation fails', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    accessTokenManagerMock.generateEngineToken.mockRejectedValue(
      new Error('Token generation failed'),
    );

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it('should return 500 when step output service throws an error', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    flowStepTestOutputServiceMock.listEncrypted.mockRejectedValue(
      new Error('Failed to get step outputs'),
    );

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it('should return 500 when engine runner throws an error', async () => {
    const testToken = await createMockToken();
    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    engineRunnerMock.executeVariable.mockRejectedValue(
      new Error('Engine execution failed'),
    );

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it('should validate required fields', async () => {
    const testToken = await createMockToken();

    // Test missing flowId
    const responseWithoutFlowId = await makeRequest({
      token: testToken,
      body: {
        flowVersionId: 'test-version-id',
        variableExpression: '{{trigger.headers}}',
      },
    });

    expect(responseWithoutFlowId?.statusCode).toBe(StatusCodes.BAD_REQUEST);

    // Test missing flowVersionId
    const responseWithoutVersionId = await makeRequest({
      token: testToken,
      body: {
        flowId: 'test-flow-id',
        variableExpression: '{{trigger.headers}}',
      },
    });

    expect(responseWithoutVersionId?.statusCode).toBe(StatusCodes.BAD_REQUEST);

    // Test missing variableExpression
    const responseWithoutExpression = await makeRequest({
      token: testToken,
      body: {
        flowId: 'test-flow-id',
        flowVersionId: 'test-version-id',
      },
    });

    expect(responseWithoutExpression?.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should work with service principal', async () => {
    const testToken = await generateMockToken({
      type: PrincipalType.SERVICE,
      projectId: 'test-project-id',
    });

    const requestBody = {
      flowId: 'test-flow-id',
      flowVersionId: 'test-version-id',
      variableExpression: '{{trigger.headers}}',
    };

    const response = await makeRequest({
      token: testToken,
      body: requestBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual({
      success: true,
      value: 'test-value',
      error: '',
    });
  });
});
