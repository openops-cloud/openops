import dayjs from 'dayjs';
import { SearchObject } from 'imapflow';

export type SearchFilters = {
  lastEpochMilliSeconds: number;
  recipients?: string[];
  cc?: string[];
  senders?: string[];
  subject?: string;
};

export function buildImapSearch({
  lastEpochMilliSeconds,
  recipients,
  cc,
  senders,
  subject,
}: SearchFilters): SearchObject {
  const sinceISO =
    lastEpochMilliSeconds === 0
      ? ''
      : dayjs(lastEpochMilliSeconds).toISOString();

  const recipientList = (recipients || []).map((s) => s.toLowerCase().trim());
  const ccList = (cc || []).map((s) => s.toLowerCase().trim());
  const senderList = (senders || []).map((s) => s.toLowerCase().trim());

  const search: SearchObject = { since: sinceISO };

  let clauses: SearchObject[] = [{}];

  if (recipientList.length > 0) {
    const next: SearchObject[] = [];
    for (const base of clauses) {
      for (const toAddr of recipientList) {
        next.push({ ...base, to: toAddr });
      }
    }
    clauses = next;
  }

  if (ccList.length > 0) {
    const next: SearchObject[] = [];
    for (const base of clauses) {
      for (const ccAddr of ccList) {
        next.push({ ...base, cc: ccAddr });
      }
    }
    clauses = next;
  }

  if (senderList.length > 0) {
    const next: SearchObject[] = [];
    for (const base of clauses) {
      for (const fromAddr of senderList) {
        next.push({ ...base, from: fromAddr });
      }
    }
    clauses = next;
  }

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
