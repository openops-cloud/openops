import { authenticationSession } from '@/app/lib/authentication-session';
import { userSettingsApi } from '@/app/lib/user-settings-api';
import { useAppStore } from '@/app/store/app-store';
import { isNil, UserSettingsDefinition } from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect } from 'react';

export const SETTINGS_KEYS = {
  isOperationalViewEnabled: 'isOperationalViewEnabled',
  isHelpViewClosed: 'isHelpViewClosed',
  isHomeCloudConnectionClosed: 'isHomeCloudConnectionClosed',
};

export const userSettingsHooks = {
  useUserSettings: () => {
    const setUserSettings = useAppStore((state) => state.setUserSettings);

    const { data, isLoading, error, refetch } = useQuery({
      queryKey: [
        'user-settings',
        authenticationSession.getProjectId(),
        authenticationSession.getCurrentUser()?.id,
        authenticationSession.getOrganizationId(),
      ],
      queryFn: async () => {
        return await userSettingsApi.getUserSettings();
      },
      retry: (failureCount, error: AxiosError) => {
        if (error.status === 404) {
          return false;
        }
        return failureCount < 4;
      },
    });

    useEffect(() => {
      if (data) {
        setUserSettings(data);
      }
    }, [data, setUserSettings]);

    return { data, isLoading, error, refetch };
  },

  useUpdateUserSettings: () => {
    const { userSettings, setUserSettings } = useAppStore((state) => ({
      userSettings: state.userSettings,
      setUserSettings: state.setUserSettings,
    }));

    const { mutateAsync } = useMutation({
      onMutate: async (settings: UserSettingsDefinition) => {
        setUserSettings({ ...userSettings, ...settings });
        return settings;
      },
      mutationFn: async () => {
        return await userSettingsApi.setUserSettings(userSettings);
      },
    });

    return { updateUserSettings: mutateAsync };
  },

  useHomePageOperationalView: () => {
    const { userSettings, setUserSettings } = useAppStore((state) => ({
      userSettings: state.userSettings,
      setUserSettings: state.setUserSettings,
    }));

    const { mutate } = useMutation({
      mutationFn: async () => {
        if (!isNil(userSettings[SETTINGS_KEYS.isOperationalViewEnabled])) {
          return null;
        }
        return await userSettingsApi.setUserSettings({
          ...userSettings,
          isOperationalViewEnabled: true,
        });
      },
      onSuccess: (updatedSettings) => {
        if (updatedSettings) {
          setUserSettings(updatedSettings);
        }
      },
    });

    return { updateHomePageOperationalViewFlag: mutate };
  },
};
