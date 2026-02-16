import {
  QueryClient,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
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
  const currentProject = queryClient.getQueryData([QueryKeys.currentProject]);
  if (currentProject) {
    queryClient.setQueryData([QueryKeys.currentProject], {
      ...currentProject,
      ...request,
    });
  }
};

const setCurrentProject = async (
  queryClient: QueryClient,
  project: Project,
  shouldReload = true,
) => {
  const currentProject = queryClient.getQueryData<Project>([
    QueryKeys.currentProject,
  ]);
  const projectChanged = currentProject?.id !== project.id;
  queryClient.setQueryData([QueryKeys.currentProject], project);
  if (projectChanged && shouldReload) {
    window.location.reload();
  }
};
