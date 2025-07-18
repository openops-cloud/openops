import { makeGetRequest } from './make-request';

// https://reference.rightscale.com/governance-policies/

const baseUrl = 'https://governance-3.rightscale.com/api/governance';

export async function getIncident({
  appRegion,
  refreshToken,
  projectId,
  incidentId,
}: {
  appRegion: string;
  refreshToken: string;
  projectId: string;
  incidentId: string;
}): Promise<any[]> {
  const url = `${baseUrl}/projects/${projectId}/incidents/${incidentId}`;

  return makeGetRequest({
    appRegion,
    refreshToken,
    url,
    headers: {
      'Api-Version': '1.0',
    },
  });
}
