import { HttpError } from '@openops/blocks-common';
import { OAuth2PropertyValue } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import * as GitApi from '../common/github-api';

export async function getGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  authProp: OAuth2PropertyValue,
): Promise<GitApi.RepositoryContent> {
  return await errorHandling<GitApi.RepositoryContent>(
    () => GitApi.getRepositoryContent(owner, repo, branch, path, authProp),
    'An error occurred getting the file from the repository.',
  );
}

export async function createNewBranch(
  owner: string,
  repo: string,
  baseBranch: string,
  newBranch: string,
  authProp: OAuth2PropertyValue,
): Promise<void> {
  try {
    await errorHandling<GitApi.GithubReference>(async () => {
      const branchResponse = await GitApi.getCurrentHeadReference(
        owner,
        repo,
        baseBranch,
        authProp,
      );

      const latestCommitSha = branchResponse.object.sha;

      return await GitApi.createNewBranchReference(
        owner,
        repo,
        newBranch,
        latestCommitSha,
        authProp,
      );
    }, 'An error occurred creating a new branch.');
  } catch (error) {
    if ((error as Error).message.includes('Reference already exists')) {
      return;
    }

    throw error;
  }
}

export async function updateFile(
  owner: string,
  repo: string,
  newBranch: string,
  filePath: string,
  title: string,
  fileSha: string,
  newContentEncoded: string,
  authProp: OAuth2PropertyValue,
): Promise<void> {
  await errorHandling<GitApi.RepositoryContent>(
    () =>
      GitApi.updateFile(
        owner,
        repo,
        newBranch,
        filePath,
        title,
        fileSha,
        newContentEncoded,
        authProp,
      ),
    'An error occurred while updating the file in the repository.',
  );
}

export async function createPullRequest(
  owner: string,
  repo: string,
  newBranch: string,
  baseBranch: string,
  title: string,
  description: string,
  authProp: OAuth2PropertyValue,
): Promise<GitApi.GithubPullRequest> {
  return await errorHandling<GitApi.GithubPullRequest>(
    () =>
      GitApi.createPullRequest(
        owner,
        repo,
        newBranch,
        baseBranch,
        title,
        description,
        authProp,
      ),
    'An error occurred creating the pull request.',
  );
}

export async function addPullRequestReviewers(
  owner: string,
  repo: string,
  pullNumber: number,
  reviewersList: string[],
  teamReviewersList: string[],
  authProp: OAuth2PropertyValue,
): Promise<GitApi.GithubPullRequest> {
  return await errorHandling<GitApi.GithubPullRequest>(
    () =>
      GitApi.addReviewersPullRequest(
        owner,
        repo,
        pullNumber,
        reviewersList,
        teamReviewersList,
        authProp,
      ),
    'An error occurred adding reviewers to the pull request.',
  );
}

async function errorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpError) {
      const bodyMessage =
        (error.response.body as { message: string }).message || '';

      logger.warn(errorMessage, {
        status: error.response.status,
        response: bodyMessage,
      });

      throw new Error(
        `${errorMessage} Status: ${error.response.status}; Message: ${bodyMessage}`,
      );
    }

    throw new Error(`${errorMessage} ${error}`);
  }
}
