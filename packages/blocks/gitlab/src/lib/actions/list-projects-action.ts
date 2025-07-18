import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { getUserProjects } from '../common/gitlab-api';

export const listProjectsAction = createAction({
  auth: auth,
  name: 'list_projects_action',
  displayName: 'List projects',
  description: 'List GitLab projects accessible to the authenticated user',
  requireAuth: true,
  props: {
    gitlabUrl: Property.ShortText({
      displayName: 'GitLab URL',
      description: 'GitLab instance URL (leave empty for gitlab.com)',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const { gitlabUrl } = propsValue;

    const projects = await getUserProjects(auth, gitlabUrl);

    return {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        path: project.path,
        path_with_namespace: project.path_with_namespace,
        namespace: project.namespace,
      })),
      total: projects.length,
    };
  },
});