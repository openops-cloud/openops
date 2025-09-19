import { getMicrosoftGraphClient } from './get-microsoft-graph-client';
import { EmailFilters, OutlookEmail } from './types';

export async function getEmails(
  accessToken: string,
  filters?: EmailFilters,
  maxResults = 50,
  orderBy = 'receivedDateTime desc',
): Promise<OutlookEmail[]> {
  const client = getMicrosoftGraphClient(accessToken);

  let filterQuery = '';
  const filterConditions: string[] = [];

  if (filters?.sender) {
    filterConditions.push(`from/emailAddress/address eq '${filters.sender}'`);
  }

  if (filters?.recipients) {
    filterConditions.push(
      `toRecipients/any(t: t/emailAddress/address eq '${filters.recipients}')`,
    );
  }

  if (filters?.cc) {
    filterConditions.push(
      `ccRecipients/any(c: c/emailAddress/address eq '${filters.cc}')`,
    );
  }

  if (filters?.subject) {
    filterConditions.push(`subject eq '${filters.subject}'`);
  }

  if (filters?.subjectContains) {
    filterConditions.push(`contains(subject, '${filters.subjectContains}')`);
  }

  if (filterConditions.length > 0) {
    filterQuery = filterConditions.join(' and ');
  }

  const queryParams: any = {
    $top: maxResults,
    $orderby: orderBy,
    $select: [
      'id',
      'subject',
      'bodyPreview',
      'body',
      'from',
      'toRecipients',
      'ccRecipients',
      'bccRecipients',
      'receivedDateTime',
      'sentDateTime',
      'hasAttachments',
      'importance',
      'isRead',
      'webLink',
    ].join(','),
  };

  if (filterQuery) {
    queryParams.$filter = filterQuery;
  }

  try {
    const response = await client.api('/me/messages').query(queryParams).get();

    return response.value || [];
  } catch (error) {
    throw new Error(`Failed to fetch emails: ${error}`);
  }
}

export async function getEmailsSince(
  accessToken: string,
  sinceDateTime: string,
  filters?: EmailFilters,
  maxResults = 50,
): Promise<OutlookEmail[]> {
  const client = getMicrosoftGraphClient(accessToken);

  const filterConditions: string[] = [`receivedDateTime gt ${sinceDateTime}`];

  if (filters?.sender) {
    filterConditions.push(`from/emailAddress/address eq '${filters.sender}'`);
  }

  if (filters?.recipients) {
    filterConditions.push(
      `toRecipients/any(t: t/emailAddress/address eq '${filters.recipients}')`,
    );
  }

  if (filters?.cc) {
    filterConditions.push(
      `ccRecipients/any(c: c/emailAddress/address eq '${filters.cc}')`,
    );
  }

  if (filters?.subject) {
    filterConditions.push(`subject eq '${filters.subject}'`);
  }

  if (filters?.subjectContains) {
    filterConditions.push(`contains(subject, '${filters.subjectContains}')`);
  }

  const queryParams: any = {
    $top: maxResults,
    $orderby: 'receivedDateTime desc',
    $filter: filterConditions.join(' and '),
    $select: [
      'id',
      'subject',
      'bodyPreview',
      'body',
      'from',
      'toRecipients',
      'ccRecipients',
      'bccRecipients',
      'receivedDateTime',
      'sentDateTime',
      'hasAttachments',
      'importance',
      'isRead',
      'webLink',
    ].join(','),
  };

  try {
    const response = await client.api('/me/messages').query(queryParams).get();

    return response.value || [];
  } catch (error) {
    throw new Error(`Failed to fetch emails since ${sinceDateTime}: ${error}`);
  }
}
