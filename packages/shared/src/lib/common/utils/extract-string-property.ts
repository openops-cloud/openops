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
      processArray(stack, value, depth);
      continue;
    }

    const valuesRecord = value as Record<string, unknown>;
    const match = checkMatchingStringProps(valuesRecord, keySet);
    if (match) {
      return match;
    }

    processObjectChildren(stack, valuesRecord, depth);
  }

  return undefined;
}

function isObjectLike(x: unknown): x is object {
  return (typeof x === 'object' && x !== null) || typeof x === 'function';
}

function processArray(
  stack: { value: unknown; depth: number }[],
  arr: unknown[],
  depth: number,
): void {
  for (let i = arr.length - 1; i >= 0; i--) {
    const el = arr[i];
    if (isObjectLike(el)) {
      stack.push({ value: el, depth: depth + 1 });
    }
  }
}

function checkMatchingStringProps(
  obj: Record<string, unknown>,
  keySet: Set<string>,
): string | undefined {
  for (const [objKey, objValue] of Object.entries(obj)) {
    if (typeof objValue === 'string' && keySet.has(objKey.toLowerCase())) {
      const s = objValue.trim();
      if (s.length > 0) {
        return s;
      }
    }
  }

  return undefined;
}

function processObjectChildren(
  stack: { value: unknown; depth: number }[],
  obj: Record<string, unknown>,
  depth: number,
): void {
  const entries = Object.entries(obj);
  for (let i = entries.length - 1; i >= 0; i--) {
    const child = entries[i][1];
    if (isObjectLike(child)) {
      stack.push({ value: child, depth: depth + 1 });
    }
  }
}
