import { t } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { setSSEActivityCallback, setSSEWarningCallback } from './chat-utils';
import { UseConnectionMonitoringReturn } from './types';

export const useConnectionMonitoring = (): UseConnectionMonitoringReturn => {
  const [isShowingSlowWarning, setIsShowingSlowWarning] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const clearConnectionState = useCallback(() => {
    setConnectionError(null);
    setIsShowingSlowWarning(false);
  }, []);

  const onSSEActivity = useCallback(() => {
    setIsShowingSlowWarning(false);
  }, []);

  const onSSEWarning = useCallback(() => {
    setIsShowingSlowWarning(true);
  }, []);

  const setConnectionErrorMessage = useCallback(() => {
    const errorMessage = t(
      'Connection lost. The server stopped responding. Start a new chat or refresh your browser.',
    );
    setConnectionError(errorMessage);
    setIsShowingSlowWarning(false);
  }, []);

  useEffect(() => {
    setSSEActivityCallback(onSSEActivity);
    setSSEWarningCallback(onSSEWarning);
    return () => {
      setSSEActivityCallback(null);
      setSSEWarningCallback(null);
    };
  }, [onSSEActivity, onSSEWarning]);

  return {
    isShowingSlowWarning,
    connectionError,
    clearConnectionState,
    setConnectionErrorMessage,
  };
};
