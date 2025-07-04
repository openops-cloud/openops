import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { getBranchProperty } from '../common/branch-property';
import { getGitlabFile } from '../common/gitlab-wrapper';
import { getProjectProperty } from '../common/project-property';

export const getFileAction = createAction({
  auth: auth,
  name: 'get_file_action',
  displayName: 'Get file content',
  description: 'Get file content from a GitLab repository',
  requireAuth: true,
  props: {
    project: getProjectProperty(),
    branch: getBranchProperty(),
    filePath: Property.ShortText({
      displayName: 'File path',
      description: 'Path to the file in the repository',
      required: true,
    }),
    gitlabUrl: Property.ShortText({
      displayName: 'GitLab URL',
      description: 'GitLab instance URL (leave empty for gitlab.com)',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const { project, branch, filePath, gitlabUrl } = propsValue;

    const response = await getGitlabFile(
      project.id,
      filePath,
      branch,
      auth,
      gitlabUrl,
    );

    if (response.encoding === 'base64') {
      const fileContent = Buffer.from(response.content, 'base64').toString('utf-8');
      return {
        content: fileContent,
        file_name: response.file_name,
        file_path: response.file_path,
        size: response.size,
        commit_id: response.commit_id,
      };
    }

    return {
      content: response.content,
      file_name: response.file_name,
      file_path: response.file_path,
      size: response.size,
      commit_id: response.commit_id,
    };
  },
});