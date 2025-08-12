import { makeGetRequest } from './make-request';

// https://reference.rightscale.com/optima-recommendations/#/Recommendations/Recommendations_index

export async function getActiveRecommendations({
  appRegion,
  refreshToken,
  orgId,
}: {
  appRegion: string;
  refreshToken: string;
  orgId: string;
}): Promise<any> {
  const baseUrl = getRecommendationsBaseUrl(appRegion);
  const url = `${baseUrl}/recommendations/orgs/${orgId}/recommendations?statuses=active`;

  return await makeGetRequest({
    refreshToken,
    appRegion,
    url,
  });
}

function getRecommendationsBaseUrl(appRegion: string): string {
  switch (appRegion) {
    case 'us':
      return 'https://api.optima.flexeraeng.com';
    case 'eu':
      return 'https://api.optima-eu.flexeraeng.com';
    case 'apac':
      return 'https://api.optima-apac.flexeraeng.com';
    default:
      throw new Error(`Unsupported region: ${appRegion}`);
  }
}
