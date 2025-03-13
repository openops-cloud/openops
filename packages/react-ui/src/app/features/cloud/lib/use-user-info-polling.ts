import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import {
  OPENOPS_CONNECT_MAX_POLL_ATTEMPTS,
  OPENOPS_CONNECT_TEMPLATES_POLL_INTERVAL_MS,
} from '@/app/constants/cloud';
import { usersApi } from '@/app/lib/users-api';
import { AxiosError, HttpStatusCode } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCloudProfile } from './use-cloud-profile';

export const useUserInfoPolling = () => {
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);

  const { refetchIsConnectedToCloudTemplates } = useCloudProfile();
  const { updateUserSettings } = userSettingsHooks.useUpdateUserSettings();

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const createPollingInterval = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        if (attemptCountRef.current >= OPENOPS_CONNECT_MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          console.warn('Max user-info polling attempts reached');
          return;
        }

        attemptCountRef.current += 1;
        const { data } = await refetchIsConnectedToCloudTemplates();

        if (data) {
          await updateUserSettings({
            telemetryInteractionTimestamp: new Date().toISOString(),
          });
          await usersApi.setTelemetry({ trackEvents: true });
          clearInterval(interval);
        }
      } catch (error) {
        const axiosError = error as AxiosError;

        if (
          !axiosError.response ||
          axiosError.response.status !== HttpStatusCode.Unauthorized
        ) {
          clearInterval(interval);
          console.error(
            'An unexpected error occurred while polling user info:',
            error,
          );
        }
      }
    }, OPENOPS_CONNECT_TEMPLATES_POLL_INTERVAL_MS);

    setPollInterval(interval);
  }, [refetchIsConnectedToCloudTemplates, updateUserSettings]);

  return {
    createPollingInterval,
  };
};
