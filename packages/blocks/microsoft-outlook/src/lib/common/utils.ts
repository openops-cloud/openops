import { Recipient } from '@microsoft/microsoft-graph-types';

export const mapEmailsToRecipients = (
  emails: string[] | undefined,
): Recipient[] | undefined => {
  return emails?.map((email) => ({
    emailAddress: {
      address: email,
    },
  }));
};
