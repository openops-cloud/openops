import { HttpMethod } from '@openops/blocks-common';
import { makePaginatedRequest, makeRequest } from './http-request';

export async function getUserProjects(
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabProject[]> {
  return makePaginatedRequest({
    url: 'projects?membership=true',
    httpMethod: HttpMethod.GET,
    authProp,
    gitlabUrl,
  });
}

export async function listBranches(
  projectId: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabBranch[]> {
  return makePaginatedRequest({
    url: `projects/${projectId}/repository/branches`,
    httpMethod: HttpMethod.GET,
    authProp,
    gitlabUrl,
  });
}

export async function getRepositoryFile(
  projectId: string,
  filePath: string,
  ref: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabRepositoryFile> {
  return makeRequest({
    url: `projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
    httpMethod: HttpMethod.GET,
    authProp,
    queryParams: { ref },
    gitlabUrl,
  });
}

export async function createFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabFileAction> {
  return makeRequest({
    url: `projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
    httpMethod: HttpMethod.POST,
    authProp,
    body: {
      file_path: filePath,
      branch,
      content,
      commit_message: commitMessage,
    },
    gitlabUrl,
  });
}

export async function updateFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabFileAction> {
  return makeRequest({
    url: `projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
    httpMethod: HttpMethod.PUT,
    authProp,
    body: {
      file_path: filePath,
      branch,
      content,
      commit_message: commitMessage,
    },
    gitlabUrl,
  });
}

export async function createBranch(
  projectId: string,
  branchName: string,
  ref: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabBranch> {
  return makeRequest({
    url: `projects/${projectId}/repository/branches`,
    httpMethod: HttpMethod.POST,
    authProp,
    body: {
      branch: branchName,
      ref,
    },
    gitlabUrl,
  });
}

export async function createMergeRequest(
  projectId: string,
  sourceBranch: string,
  targetBranch: string,
  title: string,
  description: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabMergeRequest> {
  return makeRequest({
    url: `projects/${projectId}/merge_requests`,
    httpMethod: HttpMethod.POST,
    authProp,
    body: {
      source_branch: sourceBranch,
      target_branch: targetBranch,
      title,
      description,
    },
    gitlabUrl,
  });
}

export async function getProjectMembers(
  projectId: string,
  authProp: string,
  gitlabUrl?: string,
): Promise<GitlabProjectMember[]> {
  return makePaginatedRequest({
    url: `projects/${projectId}/members`,
    httpMethod: HttpMethod.GET,
    authProp,
    gitlabUrl,
  });
}

export interface GitlabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  namespace: {
    name: string;
    path: string;
  };
}

export interface GitlabBranch {
  name: string;
  commit: {
    id: string;
  };
}

export interface GitlabRepositoryFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

export interface GitlabFileAction {
  file_path: string;
  branch: string;
}

export interface GitlabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
}

export interface GitlabProjectMember {
  id: number;
  username: string;
  name: string;
  access_level: number;
}