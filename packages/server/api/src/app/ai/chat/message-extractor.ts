export function extractMessage(
  error: unknown,
  fallback = 'An unknown error occurred. Please start a new chat.',
): string {
  if (error instanceof Error) {
    return error.message;
  }

  const messageProperty = findFirstMessageProperty(error, new Set<unknown>());
  if (messageProperty) {
    return messageProperty;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  return fallback;
}

function findFirstMessageProperty(
  obj: unknown,
  visited: Set<unknown>,
): string | undefined {
  if (obj && typeof obj === 'object') {
    if (visited.has(obj)) {
      return undefined;
    }

    visited.add(obj);
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'message' && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }

        continue;
      }

      const deeper = findFirstMessageProperty(value, visited);
      if (deeper) {
        return deeper;
      }
    }
  }
  return undefined;
}
