/**
 * Attempts to parse a value as JSON if it's a string, otherwise returns the original value.
 * @param value - The value to parse
 * @returns The parsed JSON object or the original value
 */
export const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
