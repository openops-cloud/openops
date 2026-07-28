import { api } from '@/app/lib/api';

/**
 * Required on the decision. A cross-site form post cannot set a custom header, which
 * is what stops a third party from driving the decision on a logged-in user's behalf.
 */
const CONSENT_HEADER = 'x-openops-consent';

export type OAuthResourceId = 'api' | 'mcp';

export type OAuthConsentRequest = {
  requestId: string;
  clientName: string;
  scope: string;
  resourceId: OAuthResourceId | null;
  projectId: string | null;
  projectName: string | null;
};

export type OAuthConsentDecision = {
  /** Where to send the browser next. Always one of the client's registered URIs. */
  redirectTo: string;
};

const getConsentRequest = (requestId: string): Promise<OAuthConsentRequest> =>
  api.get<OAuthConsentRequest>(`/v1/oauth/requests/${requestId}`);

const decide = (
  requestId: string,
  approve: boolean,
): Promise<OAuthConsentDecision> =>
  api.post<OAuthConsentDecision, { approve: boolean }>(
    `/v1/oauth/requests/${requestId}/decision`,
    { approve },
    undefined,
    { [CONSENT_HEADER]: '1' },
  );

export const oauthApi = {
  getConsentRequest,
  decide,
};
