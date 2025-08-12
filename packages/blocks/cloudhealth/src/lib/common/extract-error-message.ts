export function extractErrorMessage(
  e: unknown,
  defaultMsg = 'An unknown error occurred',
): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }

  if (typeof e === 'string' && e.trim() !== '') {
    return e;
  }
  return defaultMsg;
}
