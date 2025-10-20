import { ServiceNowAuth } from './auth';

/**
 * Builds the ServiceNow API base URL for the Table API
 * @param auth ServiceNow authentication object
 * @param path Optional path to append to the base URL (e.g., 'sys_db_object' or 'incident/123')
 * @returns The complete API URL
 */
export function buildServiceNowApiUrl(
  auth: ServiceNowAuth,
  path?: string,
): string {
  const baseUrl = `https://${auth.instanceName}.service-now.com/api/now/table`;
  return path ? `${baseUrl}/${path}` : baseUrl;
}
