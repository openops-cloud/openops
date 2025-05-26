import { TeamsMessageAction } from '../src/lib/common/generate-message-with-buttons';
import { generateMSTeamsRedirectURl } from '../src/lib/common/generate-ms-teams-redirect-url';

describe('generateMSTeamsRedirectURl', () => {
  const mockAction: TeamsMessageAction = {
    buttonText: 'Approve',
    buttonStyle: 'positive',
  };

  const mockContext = {
    run: {
      isTest: false,
      pauseId: 'test-pause-id',
    },
    generateResumeUrl: jest
      .fn()
      .mockImplementation(({ queryParams, baseUrl }) => {
        return new URL(
          `https://${baseUrl || 'example.com'}/resume?executionCorrelationId=${
            queryParams.executionCorrelationId
          }&button=${queryParams.button}`,
        );
      }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return test URL when context.run.isTest is true', () => {
    const testContext = {
      ...mockContext,
      run: {
        ...mockContext.run,
        isTest: true,
      },
    };

    const result = generateMSTeamsRedirectURl(mockAction, testContext);
    expect(result).toBe('https://static.openops.com/test_teams_actions.txt');
  });

  test('should generate correct URL with default baseUrl', () => {
    const result = generateMSTeamsRedirectURl(mockAction, mockContext);

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Approve',
      },
      baseUrl: undefined,
    });

    expect(result).toContain(
      'https://static.openops.com/html/resume_execution.html',
    );
    expect(result).toContain('redirectUrl=https%3A%2F%2Fexample.com%2Fresume');
    expect(result).toContain('executionCorrelationId%3Dtest-pause-id');
    expect(result).toContain('button%3DApprove');
  });

  test('should use provided baseUrl when specified', () => {
    const baseUrl = 'custom-domain.com';
    const result = generateMSTeamsRedirectURl(mockAction, mockContext, baseUrl);

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Approve',
      },
      baseUrl,
    });

    expect(result).toContain(
      'redirectUrl=https%3A%2F%2Fcustom-domain.com%2Fresume',
    );
  });

  test('should handle different button text correctly', () => {
    const customAction: TeamsMessageAction = {
      buttonText: 'Reject',
      buttonStyle: 'destructive',
    };

    const result = generateMSTeamsRedirectURl(customAction, mockContext);

    expect(result).toContain('button%3DReject');
  });
});
