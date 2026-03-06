import { PropertyLocation, PropertySource } from './property-source';

const DEFAULT_PROJECT_KEY = 'projectId';
const DEFAULT_ORGANIZATION_KEY = 'organizationId';

type PropertyHelpers = {
  fromParams: (key?: string) => PropertySource;
  fromQuery: (key?: string) => PropertySource;
  fromBody: (key?: string) => PropertySource;
};

function createPropertySource(
  location: PropertyLocation,
  defaultKey: string,
  key?: string,
): PropertySource {
  return {
    location,
    key: key ?? defaultKey,
  };
}

function createPropertyHelpers(defaultKey: string): PropertyHelpers {
  return {
    fromParams: (key?: string): PropertySource =>
      createPropertySource(PropertyLocation.PARAMS, defaultKey, key),

    fromQuery: (key?: string): PropertySource =>
      createPropertySource(PropertyLocation.QUERY, defaultKey, key),

    fromBody: (key?: string): PropertySource =>
      createPropertySource(PropertyLocation.BODY, defaultKey, key),
  };
}

export const projectIdResolver = createPropertyHelpers(DEFAULT_PROJECT_KEY);
export const organizationIdResolver = createPropertyHelpers(
  DEFAULT_ORGANIZATION_KEY,
);
