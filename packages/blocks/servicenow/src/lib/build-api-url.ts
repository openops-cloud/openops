import { ServiceNowAuth } from './auth';

export function buildServiceNowApiUrl(
  auth: ServiceNowAuth,
  path?: string,
): string {
  const baseUrl = `https://${auth.instanceName}.service-now.com/api/now/table`;
  return path ? `${baseUrl}/${path}` : baseUrl;
}
