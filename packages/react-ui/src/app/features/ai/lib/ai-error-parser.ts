import { t } from 'i18next';

interface ParsedError {
  userFriendlyMessage: string;
  details?: string;
  severity: 'error' | 'warning';
}

/**
 * Extracts the main error from a nested error structure
 */
function extractMainError(errorObj: any): any {
  if (errorObj?.error) {
    return extractMainError(errorObj.error);
  }
  return errorObj;
}

/**
 * Parses context length exceeded errors
 */
function parseContextLengthError(errorObj: any): ParsedError | null {
  const mainError = extractMainError(errorObj);

  if (mainError?.code === 'context_length_exceeded') {
    return {
      userFriendlyMessage: t(
        'Your input is too long for this AI model. Please shorten your message or start a new chat.',
      ),
      details: mainError.message,
      severity: 'error',
    };
  }

  return null;
}

/**
 * Parses type validation errors to extract meaningful information
 */
function parseValidationError(errorMessage: string): ParsedError | null {
  // Look for common patterns in the error message
  if (errorMessage.includes('context_length_exceeded')) {
    try {
      // Try to extract the JSON error object
      const jsonMatch = errorMessage.match(/\{"type":"error".*?\}\}\}/);
      if (jsonMatch) {
        const errorObj = JSON.parse(jsonMatch[0]);
        const contextError = parseContextLengthError(errorObj);
        if (contextError) return contextError;
      }
    } catch {
      // Fallback if JSON parsing fails
      return {
        userFriendlyMessage: t(
          'Your input is too long for this AI model. Please shorten your message or start a new chat.',
        ),
        severity: 'error',
      };
    }
  }

  // Check for other specific error patterns
  if (errorMessage.includes('invalid_request_error')) {
    return {
      userFriendlyMessage: t(
        'There was an issue with your request. Please try again or start a new chat.',
      ),
      details: 'Invalid request error',
      severity: 'error',
    };
  }

  if (errorMessage.includes('Type validation failed')) {
    return {
      userFriendlyMessage: t(
        'The AI service encountered a technical issue. Please try again.',
      ),
      details: 'Type validation failed',
      severity: 'error',
    };
  }

  return null;
}

/**
 * Parses general error messages for common patterns
 */
function parseGenericError(errorMessage: string): ParsedError {
  // Remove technical details and provide user-friendly messages
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      userFriendlyMessage: t(
        'Network connection issue. Please check your internet connection and try again.',
      ),
      severity: 'error',
    };
  }

  if (errorMessage.includes('timeout')) {
    return {
      userFriendlyMessage: t('The request timed out. Please try again.'),
      severity: 'error',
    };
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return {
      userFriendlyMessage: t(
        'Rate limit exceeded. Please wait a moment before trying again.',
      ),
      severity: 'error',
    };
  }

  // For very long error messages, truncate them
  const truncatedMessage =
    errorMessage.length > 200
      ? `${errorMessage.substring(0, 200)}...`
      : errorMessage;

  return {
    userFriendlyMessage: truncatedMessage,
    severity: 'error',
  };
}

/**
 * Main function to parse AI errors and return user-friendly messages
 */
export function parseAiError(error: unknown): ParsedError {
  let errorMessage = '';

  // Extract the error message
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    errorMessage = (error as any).message || '';
  } else {
    return {
      userFriendlyMessage: t('An unexpected error occurred. Please try again.'),
      severity: 'error',
    };
  }

  // Try to parse specific error types
  const validationError = parseValidationError(errorMessage);
  if (validationError) {
    return validationError;
  }

  // Fall back to generic error parsing
  return parseGenericError(errorMessage);
}

/**
 * Creates a toast-ready message from a parsed error
 */
export function createErrorToast(error: unknown) {
  const parsed = parseAiError(error);

  return {
    title: t('AI Chat Error'),
    description: parsed.userFriendlyMessage,
    variant: 'destructive' as const,
    duration: 10000,
  };
}
