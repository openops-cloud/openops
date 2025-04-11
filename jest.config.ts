import { getJestProjects } from '@nx/jest';

export default {
  projects: getJestProjects(),
  setupFiles: ['jest.env.js'],
  transformIgnorePatterns: ['^.+\\.js$']
};
