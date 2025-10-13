import { createAction, Property } from '@openops/blocks-framework';
import { auth } from '../common/auth';
import { generateBranchName } from '../common/branch-name-generator';
import { getBranchProperty } from '../common/branch-property';
import {
  addPullRequestReviewers,
  createNewBranch,
  createPullRequest,
  getGitHubFile,
  updateFile,
} from '../common/github-wrapper';
import { getRepositoryProperty } from '../common/repository-property';
import { getReviewersProperty } from '../common/reviewers-property';
import { getTeamReviewersProperty } from '../common/team-reviewers-property';

export const createPullRequestAction = createAction({
  auth: auth,
  name: 'create_pull_request_action',
  description: 'Create a new pull request',
  displayName: 'Create pull request',
  requireAuth: true,
  isWriteAction: true,
  props: {
    repository: getRepositoryProperty(),
    baseBranch: getBranchProperty(),
    filePath: Property.ShortText({
      displayName: 'File path',
      description: 'Path of the file that will be changed.',
      required: true,
    }),
    newFileContent: Property.ShortText({
      displayName: 'New file content',
      description: 'New content for the file.',
      required: true,
    }),
    title: Property.ShortText({
      displayName: 'Pull request title',
      description: 'Message for the pull request title.',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Pull request description',
      description: 'Message for the pull request description.',
      required: true,
    }),
    reviewers: getReviewersProperty(),
    teamReviewers: getTeamReviewersProperty(),
  },
  async run(context) {
    const { auth, propsValue } = context;
    const {
      repository,
      baseBranch,
      filePath,
      newFileContent,
      title,
      description,
      reviewers,
      teamReviewers,
    } = propsValue;

    const newBranch = generateBranchName(context.run.name);

    const currentFile = await getGitHubFile(
      repository.owner,
      repository.repo,
      baseBranch,
      filePath,
      auth,
    );

    await createNewBranch(
      repository.owner,
      repository.repo,
      baseBranch,
      newBranch,
      auth,
    );

    const newContentEncoded = Buffer.from(newFileContent).toString('base64');

    await updateFile(
      repository.owner,
      repository.repo,
      newBranch,
      filePath,
      title,
      currentFile.sha,
      newContentEncoded,
      auth,
    );

    const response = await createPullRequest(
      repository.owner,
      repository.repo,
      newBranch,
      baseBranch,
      title,
      description,
      auth,
    );

    if (reviewersDefined(reviewers) || reviewersDefined(teamReviewers)) {
      const reviewersList = convertToReviewersArrayWithValidation(reviewers);
      const teamReviewersList =
        convertToReviewersArrayWithValidation(teamReviewers);

      await addPullRequestReviewers(
        repository.owner,
        repository.repo,
        response.number,
        reviewersList,
        teamReviewersList,
        auth,
      );
    }

    return response.html_url;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reviewersDefined(reviewers: any): boolean {
  return (
    reviewers &&
    ((typeof reviewers === 'string' && reviewers.trim() !== '') ||
      (Array.isArray(reviewers) && reviewers.length !== 0))
  );
}

function convertToReviewersArrayWithValidation(input: any): string[] {
  const reviewers = Array.isArray(input) ? input : [input];

  if (
    !reviewers.every(
      (reviewers) => reviewers !== null && typeof reviewers === 'string',
    )
  ) {
    throw new Error(
      'Input should be a single reviewer or an array of reviewers',
    );
  }

  return reviewers;
}
