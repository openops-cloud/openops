import { QueryKeys } from '@/app/constants/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useRefetchFolderTree = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.foldersFlows],
      }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.foldersFlowsSearch],
      }),
    ]);
  }, [queryClient]);
};
