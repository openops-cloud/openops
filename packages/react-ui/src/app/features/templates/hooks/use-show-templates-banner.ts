import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useMemo } from 'react';
import { useCloudProfile } from '../../cloud/lib/use-cloud-profile';

/**
 * Custom hook to determine if the templates banner should be shown.
 * It checks if the user is connected to cloud templates and if the cloud templates flag is enabled.
 *
 * @returns {boolean} isCloudUser - True if the user is connected to cloud templates and cloud templates are enabled.
 */
export const useShowTemplatesBanner = () => {
  const { isConnectedToCloudTemplates } = useCloudProfile();
  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();

  const isCloudUser = useMemo(() => {
    return isConnectedToCloudTemplates && !!useCloudTemplates;
  }, [isConnectedToCloudTemplates, useCloudTemplates]);

  return { isCloudUser };
};
