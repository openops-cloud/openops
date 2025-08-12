import { makeGetRequest } from './make-request';

// https://developer.flexera.com/docs/api/Automation#/

export async function getAppliedPolicies({
  appRegion,
  refreshToken,
  orgId,
  projectId,
}: {
  appRegion: string;
  refreshToken: string;
  orgId: string;
  projectId: string;
}): Promise<any[]> {
  const baseUrl = getAutomationsBaseUrl(appRegion);
  const url = `${baseUrl}/policy/v1/orgs/${orgId}/projects/${projectId}/applied-policies`;

  const result: any = await makeGetRequest({
    refreshToken,
    appRegion,
    url,
  });

  return result.values || [];
}

function getAutomationsBaseUrl(appRegion: string): string {
  switch (appRegion) {
    case 'us':
      return 'https://api.flexera.com';
    case 'eu':
      return 'https://api.flexera.eu';
    case 'apac':
      return 'https://api.flexera.au';
    default:
      throw new Error(`Unsupported region: ${appRegion}`);
  }
}
