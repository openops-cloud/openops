import { getRecommendationsAction } from './base-get-recommendations-action';

export const getAzureRecommendationsAction = getRecommendationsAction(
  'Azure',
  getAzureRecommendationTypes(),
);

export function getAzureRecommendationTypes() {
  return [
    { label: 'Compute (VMs)', value: 'compute' },
    { label: 'Managed Disk', value: 'disk' },
    { label: 'SQL Database', value: 'sql' },
  ];
}
