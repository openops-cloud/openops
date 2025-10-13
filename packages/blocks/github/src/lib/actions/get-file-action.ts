import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { getBranchProperty } from '../common/branch-property';
import { getGitHubFile } from '../common/github-wrapper';
import { getRepositoryProperty } from '../common/repository-property';

export const getFileAction = createAction({
  auth: auth,
  name: 'get_file_action',
  displayName: 'Get file content',
  description: 'Get file content from a repository',
  requireAuth: true,
  IsWriteAction: false,
  props: {
    repository: getRepositoryProperty(),
    branch: getBranchProperty(),
    filePath: Property.ShortText({
      displayName: 'File path',
      description: '',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const { repository, branch, filePath } = propsValue;

    const response = await getGitHubFile(
      repository.owner,
      repository.repo,
      branch,
      filePath,
      auth,
    );

    if (response.type === 'dir') {
      throw new Error(
        "It looks like you've provided a directory path instead of a file path. Please make sure to provide the correct file path.",
      );
    }

    const fileContent = Buffer.from(response.content, 'base64').toString(
      'utf-8',
    );

    return fileContent;
  },
});
