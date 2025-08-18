import { httpClient, HttpMethod } from '@openops/blocks-common';
import { FinOutAuth } from '../auth';

export async function getScans(
  auth: FinOutAuth,
): Promise<{ id: string; name: string }[]> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.POST,
    url: `https://app.finout.io/cost-guard-service/all-scans-configurations`,
    headers: {
      'x-finout-client-id': auth.clientId,
      'x-finout-secret-key': auth.secretKey,
    },
  });

  const result = response.body;

  return result;
}

export async function getScanRecommendations(
  auth: FinOutAuth,
  scanId: string,
): Promise<any> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.POST,
    url: `https://app.finout.io/v1/cost-guard/scans-recommendations`,
    headers: {
      'x-finout-client-id': auth.clientId,
      'x-finout-secret-key': auth.secretKey,
    },
    body: { scanId },
  });

  const result = response.body;

  return result;
}
