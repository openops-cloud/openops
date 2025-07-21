import { getRecommendationsAction } from './base-get-recommendations-action';

export const getGcpRecommendationsAction = getRecommendationsAction(
  'GCP',
  getGcpRecommendationTypes(),
);

export function getGcpRecommendationTypes() {
  return [
    { label: 'Compute Engine', value: 'compute' },
    { label: 'Managed Instance Group', value: 'compute-mig' },
    { label: 'Persistent Disk', value: 'disk' },
  ];
}
