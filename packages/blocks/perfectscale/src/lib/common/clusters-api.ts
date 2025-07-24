import { HttpMethod } from '@openops/blocks-common';
import { makeRequest } from './make-request';

export async function getClusters(auth: any): Promise<any[]> {
  const response = await makeRequest({
    auth,
    url: `clusters`,
    method: HttpMethod.GET,
  });

  return response.data;
}

export async function getClusterWorkloads(
  auth: any,
  clusterUId: string,
): Promise<any[]> {
  const response = await makeRequest({
    auth,
    url: `clusters/${clusterUId}/workloads`,
    method: HttpMethod.GET,
  });

  return response.data;
}

export async function getClusterRecommendations(
  auth: any,
  clusterId: string,
): Promise<any[]> {
  const workloads = await getClusterWorkloads(auth, clusterId);

  return workloads.filter((x) => x.costAnalysis?.past30Days?.wastedCost > 0);
}
