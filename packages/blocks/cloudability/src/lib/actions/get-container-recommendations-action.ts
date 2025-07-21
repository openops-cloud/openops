import { getRecommendationsAction } from './base-get-recommendations-action';

export const getContainersRecommendationsAction = getRecommendationsAction(
  'Containers',
  getContainerRecommendationTypes(),
);

export function getContainerRecommendationTypes() {
  return [{ label: 'Container Workloads', value: 'workloads' }];
}
