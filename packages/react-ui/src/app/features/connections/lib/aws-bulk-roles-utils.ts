export const AWS_ACCOUNT_ID_REGEX = /^\d{12}$/;

// @openops/common (parseArn) is server-only, so the account id is extracted with a regex.
const ROLE_ARN_ACCOUNT_ID_REGEX = /^arn:aws[a-z-]*:iam::(\d{12}):role\/.+$/;

// One entry per line: the first token is the account id, anything after the
// separators (spaces, commas, semicolons, tabs) is the optional alias.
const SEPARATOR_REGEX = /[\s,;]/;
const LEADING_SEPARATORS_REGEX = /^[\s,;]+/;

export type AccountEntry = {
  id: string;
  alias: string;
};

export type ParsedAccountIds = {
  valid: AccountEntry[];
  invalid: string[];
  duplicates: string[];
  duplicateAliases: string[];
};

/**
 * Turns the textarea content into entries, one per non-empty line:
 * `id`, `id alias`, `id, alias`, `id<tab>alias` (a two-column spreadsheet
 * paste). The alias may contain spaces; it is everything after the id.
 */
export function parseAccountEntries(text: string): AccountEntry[] {
  const entries: AccountEntry[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }
    const separatorIndex = line.search(SEPARATOR_REGEX);
    if (separatorIndex === -1) {
      entries.push({ id: line, alias: '' });
      continue;
    }
    entries.push({
      id: line.slice(0, separatorIndex),
      alias: line
        .slice(separatorIndex)
        .replace(LEADING_SEPARATORS_REGEX, '')
        .trim(),
    });
  }

  return entries;
}

export function parseAccountIds(
  text: string,
  existingAccountIds: Set<string>,
  existingAliases: Set<string> = new Set(),
): ParsedAccountIds {
  const valid: AccountEntry[] = [];
  const invalid = new Set<string>();
  const duplicates = new Set<string>();
  const duplicateAliases = new Set<string>();
  const seenIds = new Set<string>();
  const seenAliases = new Set<string>(existingAliases);

  for (const { id, alias } of parseAccountEntries(text)) {
    if (!AWS_ACCOUNT_ID_REGEX.test(id)) {
      invalid.add(id);
      continue;
    }
    if (existingAccountIds.has(id) || seenIds.has(id)) {
      duplicates.add(id);
      continue;
    }
    if (alias !== '') {
      if (seenAliases.has(alias)) {
        duplicateAliases.add(alias);
        continue;
      }
      seenAliases.add(alias);
    }
    seenIds.add(id);
    valid.push({ id, alias });
  }

  return {
    valid,
    invalid: Array.from(invalid),
    duplicates: Array.from(duplicates),
    duplicateAliases: Array.from(duplicateAliases),
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
