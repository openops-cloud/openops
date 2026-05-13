export type ServiceNowAuth = {
  username: string;
  password: string;
  instanceName: string;
};

export function buildServiceNowApiUrl(
  auth: ServiceNowAuth,
  path?: string,
): string {
  const baseUrl = `https://${auth.instanceName}.service-now.com/api/now/table`;
  return path ? `${baseUrl}/${path}` : baseUrl;
}

export function generateAuthHeader(auth: ServiceNowAuth) {
  return {
    Authorization: `Basic ${Buffer.from(
      `${auth.username}:${auth.password}`,
    ).toString('base64')}`,
  };
}
