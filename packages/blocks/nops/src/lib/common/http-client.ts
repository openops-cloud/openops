import { httpClient, HttpMethod, HttpResponse } from '@openops/blocks-common';
import { nOpsAuth } from '../auth';
import { BASE_NOPS_URL } from './base-url';

export async function makeGetRequest(
  auth: nOpsAuth,
  path: string,
  queryParams?: Record<string, any>,
): Promise<HttpResponse> {
  const headers: Record<string, string> = {};

  if (auth.signature) {
    headers['X-Nops-Signature'] = String(auth.signature);
  }

  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: `${BASE_NOPS_URL}${path}`,
    headers: {
      'X-Nops-Api-Key': auth.apiKey,
      'Content-Type': 'application/json',
      ...headers,
    },
    queryParams,
  });

  return response;
}

export async function makePostRequest<T = unknown>(
  auth: nOpsAuth,
  path: string,
  body: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (auth.signature) {
    headers['X-Nops-Signature'] = String(auth.signature);
  }

  const response = await httpClient.sendRequest<T>({
    method: HttpMethod.POST,
    url: `${BASE_NOPS_URL}${path}`,
    headers: {
      'X-Nops-Api-Key': auth.apiKey,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body,
  });

  return response.body;
}
