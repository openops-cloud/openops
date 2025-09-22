const DEFAULT_MAX_DEPTH = 50;

/**
 * Extract a string from an unknown value by searching
 * for the first matching property name, or falling back to a
 * top-level string.
 */
export function extractPropertyString(
  obj: unknown,
  keys: readonly string[],
): string | null {
  if (keys.length === 0) {
    return null;
  }

  const keySet = new Set(keys.map((k) => k.toLowerCase()));
  const visited = new WeakSet<object>();

  const found = findFirstStringProperty(obj, keySet, visited, 0);

  if (found) {
    return found;
  }

  if (typeof obj === 'string') {
    const s = obj.trim();
    return s.length > 0 ? s : null;
  }

  return null;
}

function findFirstStringProperty(
  value: unknown,
  keySet: Set<string>,
  visited: WeakSet<object>,
  depth: number,
): string | undefined {
  if (depth > DEFAULT_MAX_DEPTH) {
    return undefined;
  }

  if (isObjectLike(value)) {
    if (visited.has(value)) {
      return undefined;
    }

    visited.add(value);
    if (Array.isArray(value)) {
      for (const objValue of value) {
        const deeper = findFirstStringProperty(
          objValue,
          keySet,
          visited,
          depth + 1,
        );

        if (deeper) {
          return deeper;
        }
      }

      return undefined;
    }

    for (const [objKey, objValue] of Object.entries(value)) {
      const key = objKey.toLowerCase();

      if (keySet.has(key) && typeof objValue === 'string') {
        const s = objValue.trim();
        if (s.length > 0) {
          return s;
        }
      }

      const deeper = findFirstStringProperty(
        objValue,
        keySet,
        visited,
        depth + 1,
      );

      if (deeper) {
        return deeper;
      }
    }
  }

  return undefined;
}

function isObjectLike(x: unknown): x is object {
  return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
