import {
  QueryClient,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { projectApi } from '@/app/lib/project-api';
import { Project } from '@openops/shared';

export const projectHooks = {
  prefetchProject: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePrefetchQuery<Project, Error>({
      queryKey: [QueryKeys.currentProject],
      queryFn: projectApi.current,
      staleTime: Infinity,
    });
  },
  useCurrentProject: () => {
    const query = useSuspenseQuery<Project, Error>({
      queryKey: [QueryKeys.currentProject],
      queryFn: projectApi.current,
      staleTime: Infinity,
    });
    return {
      ...query,
      project: query.data,
      updateProject,
      setCurrentProject,
    };
  },
  useProjects: () => {
    return useQuery<Project[], Error>({
      queryKey: [QueryKeys.projects],
      queryFn: async () => {
        const results = await projectApi.list({
          cursor: undefined,
          limit: 100,
        });
        return results.data;
      },
    });
  },
};

const updateProject = async (queryClient: QueryClient, request: any) => {
  queryClient.setQueryData([QueryKeys.currentProject], {
    ...queryClient.getQueryData([QueryKeys.currentProject])!,
    ...request,
  });
};

const setCurrentProject = async (
  queryClient: QueryClient,
  project: Project,
  shouldReload = true,
) => {
  const projectChanged = authenticationSession.getProjectId() !== project.id;
  if (projectChanged) {
    await authenticationSession.switchToSession(project.id);
  }
  queryClient.setQueryData([QueryKeys.currentProject], project);
  if (projectChanged && shouldReload) {
    window.location.reload();
  }
};
