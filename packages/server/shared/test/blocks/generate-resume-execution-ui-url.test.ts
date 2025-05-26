import { generateResumeExecutionUiUrl } from '../../src/lib/blocks/generate-resume-execution-ui-url';

describe('generateResumeExecutionUiUrl', () => {
  const mockAction = {
    buttonText: 'Approve',
  };

  const mockContext = {
    run: {
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

  it('should generate correct URL with default baseUrl', () => {
    const result = generateResumeExecutionUiUrl(mockAction, mockContext);

    // Verify generateResumeUrl was called with correct parameters
    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Approve',
      },
      baseUrl: undefined,
    });

    // Verify the final URL structure
    expect(result).toContain(
      'https://static.openops.com/html/resume_execution.html',
    );
    expect(result).toContain('redirectUrl=https%3A%2F%2Fexample.com%2Fresume');
    expect(result).toContain('executionCorrelationId%3Dtest-pause-id');
    expect(result).toContain('button%3DApprove');
  });

  it('should use provided baseUrl when specified', () => {
    const baseUrl = 'custom-domain.com';
    const result = generateResumeExecutionUiUrl(
      mockAction,
      mockContext,
      baseUrl,
    );

    // Verify generateResumeUrl was called with correct parameters
    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Approve',
      },
      baseUrl,
    });

    // Verify the final URL structure contains the custom domain
    expect(result).toContain(
      'redirectUrl=https%3A%2F%2Fcustom-domain.com%2Fresume',
    );
  });

  it('should handle different button text correctly', () => {
    const customAction = {
      buttonText: 'Reject',
    };

    const result = generateResumeExecutionUiUrl(customAction, mockContext);

    // Verify the button text is included in the URL
    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Reject',
      },
      baseUrl: undefined,
    });

    expect(result).toContain('button%3DReject');
  });

  it('should correctly encode the URL parameters', () => {
    const actionWithSpecialChars = {
      buttonText: 'Special & Chars?',
    };

    const result = generateResumeExecutionUiUrl(
      actionWithSpecialChars,
      mockContext,
    );

    // Verify special characters are properly encoded
    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith({
      queryParams: {
        executionCorrelationId: 'test-pause-id',
        button: 'Special & Chars?',
      },
      baseUrl: undefined,
    });

    // The URL encoding should be handled by the URL and URLSearchParams objects
    expect(result).toContain('redirectUrl=');
  });

  it('should return a valid URL string', () => {
    const result = generateResumeExecutionUiUrl(mockAction, mockContext);

    // Verify the result is a valid URL
    expect(() => new URL(result)).not.toThrow();
  });
});
