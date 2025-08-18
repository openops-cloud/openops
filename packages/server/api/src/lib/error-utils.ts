/**
 * Safely extracts an error message from any error type.
 * This function handles the case where an object might have a message property
 * even if it's not an Error instance, avoiding "[object Object]" in logs.
 *
 * @param error - The error to extract message from
 * @param fallback - Optional fallback message if no meaningful message can be extracted
 * @returns A string representation of the error message
 */
export function extractErrorMessage(
  error: unknown,
  fallback = 'An unknown error occurred. Please start a new chat.',
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (error as any).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}
