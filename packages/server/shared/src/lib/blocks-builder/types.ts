export type DependencyBuildInfo = {
  name: string;
  path: string;
  lastModified: number;
  needsRebuild: boolean;
  type: 'block' | 'openops-common' | 'shared' | 'server-shared';
};

export type BuildResult = {
  blocks: DependencyBuildInfo[];
  allDeps: DependencyBuildInfo[];
  depsToRebuild: DependencyBuildInfo[];
  blocksToRebuild: DependencyBuildInfo[];
  openopsToRebuild: DependencyBuildInfo[];
  sharedToRebuild: DependencyBuildInfo[];
  serverSharedToRebuild: DependencyBuildInfo[];
};
