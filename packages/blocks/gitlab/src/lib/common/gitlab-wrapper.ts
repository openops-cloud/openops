import { HttpError } from '@openops/blocks-common';
import { logger } from '@openops/server-shared';
import * as GitlabApi from '../common/gitlab-api';

export async function getGitlabFile(
  projectId: string,
  filePath: string,
  ref: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabApi.GitlabRepositoryFile> {
  return await errorHandling<GitlabApi.GitlabRepositoryFile>(
    () => GitlabApi.getRepositoryFile(projectId, filePath, ref, authProp, gitlabUrl),
    'An error occurred getting the file from the repository.',
  );
}

export async function createNewBranch(
  projectId: string,
  baseBranch: string,
  newBranch: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<void> {
  try {
    await errorHandling<GitlabApi.GitlabBranch>(async () => {
      return await GitlabApi.createBranch(
        projectId,
        newBranch,
        baseBranch,
        authProp,
        gitlabUrl,
      );
    }, 'An error occurred creating a new branch.');
  } catch (error) {
    if ((error as Error).message.includes('already exists')) {
      return;
    }

    throw error;
  }
}

export async function updateFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabApi.GitlabFileAction> {
  return await errorHandling<GitlabApi.GitlabFileAction>(
    () => GitlabApi.updateFile(projectId, filePath, content, commitMessage, branch, authProp, gitlabUrl),
    'An error occurred while updating the file in the repository.',
  );
}

export async function createFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabApi.GitlabFileAction> {
  return await errorHandling<GitlabApi.GitlabFileAction>(
    () => GitlabApi.createFile(projectId, filePath, content, commitMessage, branch, authProp, gitlabUrl),
    'An error occurred while creating the file in the repository.',
  );
}

export async function createMergeRequest(
  projectId: string,
  sourceBranch: string,
  targetBranch: string,
  title: string,
  description: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabApi.GitlabMergeRequest> {
  return await errorHandling<GitlabApi.GitlabMergeRequest>(
    () => GitlabApi.createMergeRequest(projectId, sourceBranch, targetBranch, title, description, authProp, gitlabUrl),
    'An error occurred while creating the merge request.',
  );
}

async function errorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error);

    if (error instanceof HttpError) {
      throw new Error(
        `${errorMessage} Status: ${error.status}; Message: ${error.message}`,
      );
    }

    throw new Error(`${errorMessage} ${(error as Error).message}`);
  }
}