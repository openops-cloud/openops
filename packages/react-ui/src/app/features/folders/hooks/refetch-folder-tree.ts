import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useRefetchFolderTree = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.foldersFlows,
          authenticationSession.getProjectId(),
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.foldersFlowsSearch],
      }),
    ]);
  }, [queryClient]);
};
