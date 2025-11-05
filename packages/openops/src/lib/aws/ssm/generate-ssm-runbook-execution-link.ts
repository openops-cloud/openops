const encodeParamValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'string') {
    return encodeURIComponent(value);
  }

  if (Array.isArray(value)) {
    const allPrimitives = value.every(
      (v) =>
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean',
    );

    if (allPrimitives) {
      const joined = value.map((v) => String(v)).join(', ');
      return encodeURIComponent(joined);
    }

    return encodeURIComponent(JSON.stringify(value));
  }

  return encodeURIComponent(JSON.stringify(value));
};

export const generateBaseSSMRunbookExecutionLink = (
  region: string,
  runbookName: string,
  version?: string,
) => {
  return `https://${region}.console.aws.amazon.com/systems-manager/automation/execute/${encodeURIComponent(
    runbookName,
  )}?region=${encodeURIComponent(region)}${
    version ? `&documentVersion=${encodeURIComponent(version)}` : ''
  }`;
};

export const generateSSMRunbookExecutionParams = (
  parameters: Record<string, unknown>,
) => {
  const inputParams = parameters;
  const entries = Object.entries(inputParams);

  const hashParts: string[] = [];
  for (const [key, value] of entries) {
    const encodedValue = encodeParamValue(value);
    if (encodedValue) {
      hashParts.push(`${encodeURIComponent(key)}=${encodedValue}`);
    }
  }

  return hashParts.length ? `#${hashParts.join('&')}` : '';
};
