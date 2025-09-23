import dayjs from 'dayjs';
import { SearchObject } from 'imapflow';

export type SearchFilters = {
  lastEpochMilliSeconds: number;
  recipients?: string[];
  cc?: string[];
  senders?: string[];
  subject?: string;
};

function normalizeList(list?: string[]): string[] {
  return (list || []).map((s) => s.toLowerCase().trim());
}

function expandClauses(
  clauses: SearchObject[],
  key: 'to' | 'cc' | 'from',
  values: string[],
): SearchObject[] {
  if (values.length === 0) return clauses;
  const next: SearchObject[] = [];
  for (const base of clauses) {
    for (const val of values) {
      next.push({ ...base, [key]: val });
    }
  }
  return next;
}

export function buildImapSearch({
  lastEpochMilliSeconds,
  recipients,
  cc,
  senders,
  subject,
}: SearchFilters): SearchObject {
  const sinceISO =
    lastEpochMilliSeconds === 0
      ? dayjs().subtract(3, 'month').toISOString()
      : dayjs(lastEpochMilliSeconds).toISOString();

  const recipientList = normalizeList(recipients);
  const ccList = normalizeList(cc);
  const senderList = normalizeList(senders);

  const search: SearchObject = { since: sinceISO };

  let clauses: SearchObject[] = [{}];
  clauses = expandClauses(clauses, 'to', recipientList);
  clauses = expandClauses(clauses, 'cc', ccList);
  clauses = expandClauses(clauses, 'from', senderList);

  const trimmedSubject = subject?.trim();
  if (trimmedSubject) {
    search.subject = trimmedSubject;
  }

  const hasConstraints =
    recipientList.length > 0 || ccList.length > 0 || senderList.length > 0;

  if (hasConstraints) {
    if (clauses.length === 1) {
      Object.assign(search, clauses[0]);
    } else {
      search.or = clauses;
    }
  }

  return search;
}
