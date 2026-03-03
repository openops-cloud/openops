import { ProjectIdLocation, ProjectIdSource } from './project-id-source';

const DEFAULT_KEY = 'projectId';

function createProjectIdSource(
  location: ProjectIdLocation,
  key: string = DEFAULT_KEY,
): ProjectIdSource {
  return { location, key };
}

function projectIdFrom(location: ProjectIdLocation) {
  return (key?: string): ProjectIdSource =>
    createProjectIdSource(location, key);
}

export const projectIdFromParams = projectIdFrom(ProjectIdLocation.PARAMS);
export const projectIdFromQuery = projectIdFrom(ProjectIdLocation.QUERY);
export const projectIdFromBody = projectIdFrom(ProjectIdLocation.BODY);