import { createAction } from '@openops/blocks-framework';
import { perfectscaleAuth } from '../auth';
import { getClusters } from '../common/clusters-api';

export const getClustersAction = createAction({
  name: 'perfectscale_get_clusters',
  displayName: 'Get Clusters',
  description: 'Get clusters',
  auth: perfectscaleAuth,
  props: {},
  async run(context) {
    return await getClusters(context.auth);
  },
});
