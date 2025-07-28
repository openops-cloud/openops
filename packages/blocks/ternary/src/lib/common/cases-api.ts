import { HttpMethod } from '@openops/blocks-common';
import { sendTernaryRequest } from '.';
import { ternaryAuth } from './auth';

export async function getCases(auth: ternaryAuth) {
  const response = await sendTernaryRequest({
    auth: auth,
    method: HttpMethod.GET,
    url: 'cases',
    queryParams: {
      tenantID: auth.tenantId,
    },
  });
  return response.body?.cases as any[];
}

export enum CasesFilter {
  ALL = 'all',
  ONLY_WITHOUT_CASES = 'only_no_cases',
  ONLY_WITH_CASES = 'only_with_cases',
}
