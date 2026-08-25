export const AWS_ACCOUNT_ID_REGEX = /^\d{12}$/;

// @openops/common (parseArn) is server-only, so the account id is extracted with a regex.
const ROLE_ARN_ACCOUNT_ID_REGEX = /^arn:aws[a-z-]*:iam::(\d{12}):role\/.+$/;

const ACCOUNT_ID_SEPARATOR_REGEX = /[\s,;]+/;

export type ParsedAccountIds = {
  valid: string[];
  invalid: string[];
  duplicates: string[];
};

export function parseAccountIds(
  text: string,
  existingAccountIds: Set<string>,
): ParsedAccountIds {
  const valid: string[] = [];
  const invalid = new Set<string>();
  const duplicates = new Set<string>();
  const seen = new Set<string>();

  for (const token of text.split(ACCOUNT_ID_SEPARATOR_REGEX)) {
    if (token === '') {
      continue;
    }
    if (!AWS_ACCOUNT_ID_REGEX.test(token)) {
      invalid.add(token);
      continue;
    }
    if (existingAccountIds.has(token) || seen.has(token)) {
      duplicates.add(token);
      continue;
    }
    seen.add(token);
    valid.push(token);
  }

  return {
    valid,
    invalid: Array.from(invalid),
    duplicates: Array.from(duplicates),
  };
}

export function buildRoleArn(accountId: string, roleName: string): string {
  return `arn:aws:iam::${accountId}:role/${roleName}`;
}

export function accountIdFromRoleArn(arn: unknown): string | undefined {
  if (typeof arn !== 'string') {
    return undefined;
  }
  return ROLE_ARN_ACCOUNT_ID_REGEX.exec(arn)?.[1];
}
