export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: string;
  };
  from: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  ccRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  bccRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  importance: string;
  isRead: boolean;
  webLink: string;
}

export interface EmailFilters {
  sender?: string;
  recipients?: string;
  cc?: string;
  subject?: string;
  subjectContains?: string;
}
