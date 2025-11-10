import { useNetworkStatus } from '@/app/common/hooks/use-network-status';
import { ChatStatus } from 'ai';
import { t } from 'i18next';
import { useMemo } from 'react';

export const useNetworkStatusWithWarning = (chatStatus: ChatStatus) => {
  const networkStatus = useNetworkStatus();

  const shouldNotify = useMemo(() => {
    return (
      chatStatus === 'submitted' ||
      chatStatus === 'streaming' ||
      chatStatus === 'error'
    );
  }, [chatStatus]);

  const isShowingSlowWarning = shouldNotify && networkStatus === 'slow';
  const connectionError =
    shouldNotify && networkStatus === 'disconnected'
      ? t(
          'Your network connection was lost. Please check your internet connection and try again.',
        )
      : null;

  return {
    isShowingSlowWarning,
    connectionError,
  };
};
