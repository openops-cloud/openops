import { httpClient, HttpMethod } from '@openops/blocks-common';

export async function makeGetRequest<T = unknown>(
  url: string,
  authToken: string,
  queryParams?: Record<string, string>,
): Promise<T> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: url,
    headers: {
      Authorization: `${authToken}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    queryParams,
  });
  return response.body;
}

export async function makePostRequest<T = unknown>(
  url: string,
  authToken: string,
  payload: any,
): Promise<T> {
  const response = await httpClient.sendRequest<T>({
    method: HttpMethod.POST,
    url: url,
    headers: {
      Authorization: `${authToken}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: payload,
  });
  return response.body;
}

//This will be used in future - delete credentials for example
export async function makeDeleteRequest<T = unknown>(
  url: string,
  authToken: string,
): Promise<T> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.DELETE,
    url: url,
    headers: {
      Authorization: `${authToken}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
  });
  return response.body;
}
