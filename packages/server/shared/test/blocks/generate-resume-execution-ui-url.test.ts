import {
  ActionContext,
  OAuth2Property,
  OAuth2Props,
} from '@openops/blocks-framework';
import { generateResumeExecutionUiUrl } from '../../src/lib/blocks/generate-resume-execution-ui-url';

describe('generateResumeExecutionUiUrl', () => {
  const mockQuery = {
    executionCorrelationId: 'test-pause-id',
    button: 'Approve',
  };

  const mockContext = {
    run: {
      pauseId: 'test-pause-id',
    },
    generateResumeUrl: jest
      .fn()
      .mockImplementation(({ queryParams }, baseUrl) => {
        return `https://${
          baseUrl || 'example.com'
        }/resume?executionCorrelationId=${
          queryParams.executionCorrelationId
        }&button=${queryParams.button}`;
      }),
  } as unknown as ActionContext<OAuth2Property<OAuth2Props>>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate correct URL with default baseUrl', () => {
    const result = generateResumeExecutionUiUrl(mockContext, mockQuery);

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith(
      {
        queryParams: {
          executionCorrelationId: 'test-pause-id',
          button: 'Approve',
        },
      },
      undefined,
    );

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
      mockContext,
      mockQuery,
      baseUrl,
    );

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith(
      {
        queryParams: {
          executionCorrelationId: 'test-pause-id',
          button: 'Approve',
        },
      },
      baseUrl,
    );

    expect(result).toEqual(
      'https://static.openops.com/html/resume_execution.html?redirectUrl=https%3A%2F%2Fcustom-domain.com%2Fresume%3FexecutionCorrelationId%3Dtest-pause-id%26button%3DApprove',
    );
  });

  it('should handle different button text correctly', () => {
    const customQuery = {
      executionCorrelationId: 'test-pause-id',
      button: 'Reject',
    };

    const result = generateResumeExecutionUiUrl(mockContext, customQuery);

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith(
      {
        queryParams: {
          executionCorrelationId: 'test-pause-id',
          button: 'Reject',
        },
      },
      undefined,
    );

    expect(result).toContain('button%3DReject');
  });

  it('should correctly encode the URL parameters', () => {
    const queryWithSpecialChars = {
      executionCorrelationId: 'test-pause-id',
      button: 'Special & Chars?',
    };

    const result = generateResumeExecutionUiUrl(
      mockContext,
      queryWithSpecialChars,
    );

    expect(mockContext.generateResumeUrl).toHaveBeenCalledWith(
      {
        queryParams: {
          executionCorrelationId: 'test-pause-id',
          button: 'Special & Chars?',
        },
      },
      undefined,
    );

    expect(result).toContain('redirectUrl=');
  });

  it('should return a valid URL string', () => {
    const result = generateResumeExecutionUiUrl(mockContext, mockQuery);

    expect(() => new URL(result)).not.toThrow();
  });
});
