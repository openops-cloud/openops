export function extractMessage(
  error: unknown,
  fallback = 'An unknown error occurred. Please start a new chat.',
): string {
  if (error instanceof Error) {
    return error.message;
  }

  const messageProperty = findFirstMessageProperty(error);
  if (messageProperty) {
    return messageProperty;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  return fallback;
}

function findFirstMessageProperty(obj: unknown): string | undefined {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'message' && typeof value === 'string') {
        return value;
      }

      const deeper = findFirstMessageProperty(value);
      if (deeper) {
        return deeper;
      }
    }
  }
  return undefined;
}
