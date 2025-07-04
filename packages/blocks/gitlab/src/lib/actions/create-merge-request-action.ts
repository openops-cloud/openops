import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { getBranchProperty } from '../common/branch-property';
import {
  createNewBranch,
  createMergeRequest,
  getGitlabFile,
  updateFile,
} from '../common/gitlab-wrapper';
import { getProjectProperty } from '../common/project-property';

export const createMergeRequestAction = createAction({
  auth: auth,
  name: 'create_merge_request_action',
  description: 'Create a new merge request in GitLab',
  displayName: 'Create merge request',
  requireAuth: true,
  props: {
    project: getProjectProperty(),
    sourceBranch: Property.ShortText({
      displayName: 'Source Branch Name',
      description: 'Name of the new branch to create for changes',
      required: true,
    }),
    targetBranch: getBranchProperty(),
    filePath: Property.ShortText({
      displayName: 'File path',
      description: 'Path of the file that will be changed',
      required: true,
    }),
    newFileContent: Property.LongText({
      displayName: 'New file content',
      description: 'The new content for the file',
      required: true,
    }),
    title: Property.ShortText({
      displayName: 'Merge request title',
      description: 'Title of the merge request',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Merge request description',
      description: 'Description of the merge request',
      required: false,
    }),
    commitMessage: Property.ShortText({
      displayName: 'Commit message',
      description: 'Commit message for the file change',
      required: true,
    }),
    gitlabUrl: Property.ShortText({
      displayName: 'GitLab URL',
      description: 'GitLab instance URL (leave empty for gitlab.com)',
      required: false,
    }),
  },
  async run(context) {
    const { auth, propsValue } = context;
    const {
      project,
      sourceBranch,
      targetBranch,
      filePath,
      newFileContent,
      title,
      description,
      commitMessage,
      gitlabUrl,
    } = propsValue;

    // Create a new branch
    await createNewBranch(
      project.id,
      targetBranch,
      sourceBranch,
      auth,
      gitlabUrl,
    );

    // Update the file in the new branch
    await updateFile(
      project.id,
      filePath,
      newFileContent,
      commitMessage,
      sourceBranch,
      auth,
      gitlabUrl,
    );

    // Create the merge request
    const response = await createMergeRequest(
      project.id,
      sourceBranch,
      targetBranch,
      title,
      description || '',
      auth,
      gitlabUrl,
    );

    return {
      merge_request_url: response.web_url,
      merge_request_id: response.id,
      merge_request_iid: response.iid,
      title: response.title,
      source_branch: response.source_branch,
      target_branch: response.target_branch,
    };
  },
});