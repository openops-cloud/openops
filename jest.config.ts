import { getJestProjects } from '@nx/jest';

export default {
  projects: getJestProjects(),
  transformIgnorePatterns: ['^.+\\.js$']
};
