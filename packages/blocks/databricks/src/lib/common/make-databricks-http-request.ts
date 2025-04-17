import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';

type DatabricksHttpRequestOptions<TBody = unknown> = {
  deploymentName: string;
  token: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  queryParams?: Record<string, string>;
  body?: TBody;
};

export function makeDatabricksHttpRequest<TResponse, TBody = unknown>(
  options: DatabricksHttpRequestOptions<TBody>,
): Promise<TResponse> {
  const {
    deploymentName,
    token,
    method,
    path,
    queryParams = {},
    body,
  } = options;

  const baseUrl = `https://${deploymentName}.cloud.databricks.com`;
  const queryString = new URLSearchParams(queryParams).toString();
  let url = baseUrl + path;
  if (queryString) {
    url += '?' + queryString;
  }

  const headers = new AxiosHeaders({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  return makeHttpRequest<TResponse>(method, url, headers, body);
}
