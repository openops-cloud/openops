import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useAppStore } from '@/app/store/app-store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cloudUserApi } from './cloud-user-api';

export const useCloudProfile = () => {
  const { setCloudUser } = useAppStore((s) => ({
    cloudUser: s.cloudUser,
    setCloudUser: s.setCloudUser,
  }));

  const { data: flags } = flagsHooks.useFlags();
  const federatedLoginEnabled = Boolean(flags?.FEDERATED_LOGIN_ENABLED);
  const cloudConnectionPageEnabled = Boolean(
    flags?.CLOUD_CONNECTION_PAGE_ENABLED,
  );
  const { data, refetch, isSuccess } = useQuery({
    queryKey: [QueryKeys.cloudUserInfo],
    queryFn: () => {
      if (federatedLoginEnabled) {
        const currentUser = authenticationSession.getCurrentUser();
        return {
          email: currentUser?.email ?? '',
        };
      }

      return cloudUserApi.getUserInfo();
    },
    enabled: !cloudConnectionPageEnabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
  });

  useEffect(() => {
    if (isSuccess) {
      setCloudUser(data);
    }
  }, [isSuccess, data, setCloudUser]);

  return {
    cloudTemplatesProfile: data,
    isConnectedToCloudTemplates: data !== null,
    refetchIsConnectedToCloudTemplates: refetch,
  };
};
