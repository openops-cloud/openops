import { createAction } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { getGcpProjects } from '../common/get-gcp-projects';

export const getGcpProjectsAction = createAction({
  name: 'cloudhealth_get_gcp_projects',
  displayName: 'Get GCP Projects',
  description: 'Retrieve a list of GCP projects',
  auth: cloudhealthAuth,
  isWriteAction: false,
  props: {},
  async run(context) {
    return await getGcpProjects(context.auth);
  },
});
