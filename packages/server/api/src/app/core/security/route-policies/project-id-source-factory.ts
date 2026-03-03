import { ProjectIdLocation, ProjectIdSource } from './project-id-source';

function createProjectIdSource(
  location: ProjectIdLocation,
  key = 'projectId',
): ProjectIdSource {
  return {
    location,
    key,
  };
}

export function projectIdFromQuery(key?: string): ProjectIdSource {
  return createProjectIdSource(ProjectIdLocation.QUERY, key);
}

export function projectIdFromParams(key?: string): ProjectIdSource {
  return createProjectIdSource(ProjectIdLocation.PARAMS, key);
}

export function projectIdFromBody(key?: string): ProjectIdSource {
  return createProjectIdSource(ProjectIdLocation.BODY, key);
}
