import {
  generateSlackRedirectUrl,
  SlackActionDefinition,
} from '../src/lib/common/generate-slack-redirect-url';

const mockAction: SlackActionDefinition = {
  buttonText: 'Approve',
  buttonStyle: 'primary',
  confirmationPrompt: false,
  confirmationPromptText: '',
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

describe('generateSlackRedirectUrl', () => {
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

    const result = generateSlackRedirectUrl(mockAction, testContext);
    expect(result).toBe(
      'https://static.openops.com/test_slack_interactions.txt',
    );
  });

  test('should generate correct URL with default parameters', () => {
    const result = generateSlackRedirectUrl(mockAction, mockContext);

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
    const result = generateSlackRedirectUrl(mockAction, mockContext, baseUrl);

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
    const customAction: SlackActionDefinition = {
      buttonText: 'Reject',
      buttonStyle: 'danger',
      confirmationPrompt: true,
      confirmationPromptText: 'Are you sure?',
    };

    const result = generateSlackRedirectUrl(customAction, mockContext);

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Reject',
      },
      baseUrl: undefined,
    });

    expect(result).toContain('button%3DReject');
  });
});
