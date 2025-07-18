import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { createFile } from '../common/gitlab-wrapper';
import { getProjectProperty } from '../common/project-property';
import { getBranchProperty } from '../common/branch-property';

export const createFileAction = createAction({
  auth: auth,
  name: 'create_file_action',
  displayName: 'Create file',
  description: 'Create a new file in a GitLab repository',
  requireAuth: true,
  props: {
    project: getProjectProperty(),
    branch: getBranchProperty(),
    filePath: Property.ShortText({
      displayName: 'File path',
      description: 'Path where the new file will be created',
      required: true,
    }),
    fileContent: Property.LongText({
      displayName: 'File content',
      description: 'Content of the new file',
      required: true,
    }),
    commitMessage: Property.ShortText({
      displayName: 'Commit message',
      description: 'Commit message for creating the file',
      required: true,
    }),
    gitlabUrl: Property.ShortText({
      displayName: 'GitLab URL',
      description: 'GitLab instance URL (leave empty for gitlab.com)',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const { project, branch, filePath, fileContent, commitMessage, gitlabUrl } = propsValue;

    const response = await createFile(
      project.id,
      filePath,
      fileContent,
      commitMessage,
      branch,
      auth,
      gitlabUrl,
    );

    return {
      file_path: response.file_path,
      branch: response.branch,
      success: true,
    };
  },
});