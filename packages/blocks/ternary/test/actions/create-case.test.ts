import { HttpMethod } from '@openops/blocks-common';
import { logger } from '@openops/server-shared';
import { createCaseAction } from '../../src/lib/actions/create-case';
import { sendTernaryRequest } from '../../src/lib/common';

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../src/lib/common', () => ({
  sendTernaryRequest: jest.fn(),
}));

describe('createCaseAction', () => {
  const mockAuth = {
    apiKey: 'test-api-key',
    tenantId: 'test-tenant-id',
    apiURL: 'https://api.test.com',
  };

  const mockResponse = {
    body: [{ id: 'case-123', name: 'Test Case' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sendTernaryRequest as jest.Mock).mockResolvedValue(mockResponse);
  });

  it('should create a case with required fields', async () => {
    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: false,
    };

    const result = await createCaseAction.run(
      createContext(mockAuth, propsValue),
    );

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: HttpMethod.POST,
      url: 'cases',
      body: {
        tenantID: mockAuth.tenantId,
        resourceID: propsValue.resourceID,
        description: propsValue.description,
        name: propsValue.caseName,
        resourceType: propsValue.resourceType,
        type: propsValue.caseType,
        linkToJira: propsValue.linkToJira,
      },
    });

    expect(result).toEqual(mockResponse.body);
  });

  it('should include assigneeIDs when provided', async () => {
    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: false,
      assigneeIDs: ['user-1', 'user-2'],
    };

    await createCaseAction.run(createContext(mockAuth, propsValue));

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: HttpMethod.POST,
      url: 'cases',
      body: {
        tenantID: mockAuth.tenantId,
        resourceID: propsValue.resourceID,
        description: propsValue.description,
        name: propsValue.caseName,
        resourceType: propsValue.resourceType,
        type: propsValue.caseType,
        linkToJira: propsValue.linkToJira,
        assigneeIDs: propsValue.assigneeIDs,
      },
    });
  });

  it('should include followerIDs when provided', async () => {
    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: false,
      followerIDs: ['user-3', 'user-4'],
    };

    await createCaseAction.run(createContext(mockAuth, propsValue));

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: HttpMethod.POST,
      url: 'cases',
      body: {
        tenantID: mockAuth.tenantId,
        resourceID: propsValue.resourceID,
        description: propsValue.description,
        name: propsValue.caseName,
        resourceType: propsValue.resourceType,
        type: propsValue.caseType,
        linkToJira: propsValue.linkToJira,
        followerIDs: propsValue.followerIDs,
      },
    });
  });

  it('should include forecast context when provided', async () => {
    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: false,
      forecastContext: 12345,
    };

    await createCaseAction.run(createContext(mockAuth, propsValue));

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: HttpMethod.POST,
      url: 'cases',
      body: {
        tenantID: mockAuth.tenantId,
        resourceID: propsValue.resourceID,
        description: propsValue.description,
        name: propsValue.caseName,
        resourceType: propsValue.resourceType,
        type: propsValue.caseType,
        linkToJira: propsValue.linkToJira,
        context: {
          forecast: 12345,
        },
      },
    });
  });

  it('should include all optional fields when provided', async () => {
    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: true,
      assigneeIDs: ['user-1', 'user-2'],
      followerIDs: ['user-3', 'user-4'],
      forecastContext: 12345,
    };

    await createCaseAction.run(createContext(mockAuth, propsValue));

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: HttpMethod.POST,
      url: 'cases',
      body: {
        tenantID: mockAuth.tenantId,
        resourceID: propsValue.resourceID,
        description: propsValue.description,
        name: propsValue.caseName,
        resourceType: propsValue.resourceType,
        type: propsValue.caseType,
        linkToJira: propsValue.linkToJira,
        assigneeIDs: propsValue.assigneeIDs,
        followerIDs: propsValue.followerIDs,
        context: {
          forecast: 12345,
        },
      },
    });
  });

  it('should handle errors and log them', async () => {
    const error = new Error('API error');
    (sendTernaryRequest as jest.Mock).mockRejectedValue(error);

    const propsValue = {
      resourceID: 'resource-123',
      description: 'Test case description',
      caseName: 'Test Case',
      resourceType: 'AWS',
      caseType: 'COST',
      linkToJira: false,
    };

    await expect(
      createCaseAction.run(createContext(mockAuth, propsValue)),
    ).rejects.toThrow('API error');

    expect(logger.error).toHaveBeenCalledWith(
      'Error creating a new case.',
      error,
    );
  });
});

function createContext(auth: unknown, props: unknown) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: props,
  };
}
