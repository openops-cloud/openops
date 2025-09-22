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

  const found = findFirstStringProperty(obj, keySet, visited);

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
  root: unknown,
  keySet: Set<string>,
  visited: WeakSet<object>,
): string | undefined {
  type Frame = { value: unknown; depth: number };
  const stack: Frame[] = [{ value: root, depth: 0 }];

  for (let frame = stack.pop(); frame; frame = stack.pop()) {
    const { value, depth } = frame;

    if (depth > DEFAULT_MAX_DEPTH) {
      continue;
    }

    if (!isObjectLike(value)) {
      continue;
    }

    if (visited.has(value)) {
      continue;
    }

    visited.add(value);
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        const el = value[i];
        if (isObjectLike(el)) {
          stack.push({ value: el, depth: depth + 1 });
        }
      }
      continue;
    }

    const entries = Object.entries(value);
    for (const [objKey, objValue] of entries) {
      if (typeof objValue === 'string' && keySet.has(objKey.toLowerCase())) {
        const s = objValue.trim();
        if (s.length > 0) {
          return s;
        }
      }
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const child = entries[i][1];
      if (isObjectLike(child)) {
        stack.push({ value: child, depth: depth + 1 });
      }
    }
  }

  return undefined;
}

function isObjectLike(x: unknown): x is object {
  return (typeof x === 'object' && x !== null) || typeof x === 'function';
}
