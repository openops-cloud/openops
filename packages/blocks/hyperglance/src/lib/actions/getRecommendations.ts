import { createAction } from '@openops/blocks-framework';
import { hyperglanceAuth } from '../auth';
import { getDatasourceProp, getResourceTypeProp } from '../hgapi/common';
import {
  fetchRecommendations,
  getRecommendationsProp,
} from '../hgapi/recommendations';

export const getRecommendations = createAction({
  auth: hyperglanceAuth,
  name: 'getRecommendations',
  displayName: 'Get Recommendations',
  description: 'Get cost optimization recommendations from Hyperglance',
  props: {
    datasource: getDatasourceProp({
      description: 'Fetch recommendations in regards to this cloud provider',
    }),
    type: getResourceTypeProp({
      required: true,
      description: 'Fetch recommendations in regards to this type of resource',
    }),
    recommendations: getRecommendationsProp(),
  },
  isWriteAction: false,
  async run(context) {
    const { auth, propsValue } = context;
    const { datasource = '', type = '' } = propsValue;
    return await fetchRecommendations(auth, {
      resourceType: { datasource, type },
      recommendation: propsValue.recommendations,
    });
  },
});
