export function escapeAttributeValue(variableValue: unknown): string {
  const sanitizedValue = convertToAttributeValue(variableValue);

  return `'${sanitizedValue.replace(/'/g, `'\\''`)}'`;
}

function convertToAttributeValue(value: unknown): string {
  if (value === 'true' || value === 'false') {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !isNaN(Number(value))
  ) {
    return String(Number(value));
  }

  if (typeof value === 'string') {
    return JSON.stringify(value.trim());
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    const items = value.map((v) => `${convertToAttributeValue(v)}`).join(',\n');

    return `[\n${items}\n]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return '{}';
    }

    const body = keys
      .map((k) => `${k} = ${convertToAttributeValue(obj[k])}`)
      .join('\n');

    return `{\n${body}\n}`;
  }

  return JSON.stringify(value);
}
