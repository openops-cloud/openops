import { SSE_HEARTBEAT_INTERVAL_MS } from '@openops/shared';
import { t } from 'i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { setSSEActivityCallback } from './chat-utils';
import {
  ChatStatus,
  ChatStatusType,
  ConnectionCheckType,
  MonitorInitialConnectionParams,
  StartGapMonitoringParams,
  Timeout,
  UseConnectionMonitoringProps,
  UseConnectionMonitoringReturn,
} from './types';

const RESPONSE_WARNING_MS = SSE_HEARTBEAT_INTERVAL_MS * 2;

const SSE_MESSAGE_GAP_TIMEOUT_MS = SSE_HEARTBEAT_INTERVAL_MS * 4;

export const useConnectionMonitoring = ({
  chatStatus,
  messages,
  stopChat,
}: UseConnectionMonitoringProps): UseConnectionMonitoringReturn => {
  const [isShowingSlowWarning, setIsShowingSlowWarning] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const lastMessageTimeRef = useRef<number>(Date.now());
  const previousStatusRef = useRef<ChatStatusType>(chatStatus);
  const previousMessageCountRef = useRef<number>(messages.length);
  const warningTimerRef = useRef<Timeout | null>(null);
  const gapMonitorTimerRef = useRef<Timeout | null>(null);

  const isShowingSlowWarningRef = useRef<boolean>(isShowingSlowWarning);
  const connectionErrorRef = useRef<string | null>(connectionError);

  const isActivelyLoading = isSubmittedOrStreaming(chatStatus);

  useEffect(() => {
    isShowingSlowWarningRef.current = isShowingSlowWarning;
  }, [isShowingSlowWarning]);

  useEffect(() => {
    connectionErrorRef.current = connectionError;
  }, [connectionError]);

  const clearConnectionState = useCallback(() => {
    setConnectionError(null);
    setIsShowingSlowWarning(false);
  }, []);

  const onSSEActivity = useCallback(() => {
    if (!isActivelyLoading) {
      return;
    }

    updateLastMessageTime(lastMessageTimeRef);

    if (isShowingSlowWarningRef.current && !connectionErrorRef.current) {
      setIsShowingSlowWarning(false);
    }
  }, [isActivelyLoading]);

  useEffect(() => {
    monitorInitialConnection({
      currentStatus: chatStatus,
      previousStatus: previousStatusRef.current,
      warningTimerRef,
      lastMessageTimeRef,
      setIsShowingSlowWarning,
    });

    previousStatusRef.current = chatStatus;

    return () => clearTimer(warningTimerRef);
  }, [chatStatus]);

  useEffect(() => {
    if (!isActivelyLoading) {
      return;
    }

    const currentMessageCount = messages.length;
    if (currentMessageCount > previousMessageCountRef.current) {
      updateLastMessageTime(lastMessageTimeRef);

      if (isShowingSlowWarningRef.current && !connectionErrorRef.current) {
        setIsShowingSlowWarning(false);
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [isActivelyLoading, messages]);

  useEffect(() => {
    if (!isActivelyLoading) {
      clearTimer(gapMonitorTimerRef);
      return;
    }

    startGapMonitoringIfNeeded({
      gapMonitorTimerRef,
      lastMessageTimeRef,
      isShowingSlowWarningRef,
      connectionErrorRef,
      setIsShowingSlowWarning,
      setConnectionError,
      stopChat,
    });

    return () => clearTimer(gapMonitorTimerRef);
  }, [isActivelyLoading, stopChat]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer(gapMonitorTimerRef);
      } else if (isActivelyLoading) {
        startGapMonitoringIfNeeded({
          gapMonitorTimerRef,
          lastMessageTimeRef,
          isShowingSlowWarningRef,
          connectionErrorRef,
          setIsShowingSlowWarning,
          setConnectionError,
          stopChat,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActivelyLoading, stopChat]);

  useEffect(() => {
    setSSEActivityCallback(onSSEActivity);
    return () => {
      setSSEActivityCallback(null);
    };
  }, [onSSEActivity]);

  return {
    isShowingSlowWarning,
    connectionError,
    clearConnectionState,
  };
};

function isSubmittedOrStreaming(status: ChatStatusType): boolean {
  return status === ChatStatus.Submitted || status === ChatStatus.Streaming;
}

function isConnectionEstablished(
  previousStatus: ChatStatusType,
  currentStatus: ChatStatusType,
): boolean {
  return (
    previousStatus === ChatStatus.Submitted &&
    currentStatus === ChatStatus.Streaming
  );
}

function clearTimer(timerRef: React.MutableRefObject<Timeout | null>): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function updateLastMessageTime(timeRef: React.MutableRefObject<number>): void {
  timeRef.current = Date.now();
}

function scheduleWarningAfterTimeout(
  timerRef: React.MutableRefObject<Timeout | null>,
  setWarning: (value: boolean) => void,
): void {
  if (!timerRef.current) {
    timerRef.current = setTimeout(() => {
      setWarning(true);
    }, RESPONSE_WARNING_MS);
  }
}

function handleSubmittedStatus(
  timerRef: React.MutableRefObject<Timeout | null>,
  timeRef: React.MutableRefObject<number>,
  setWarning: (value: boolean) => void,
): void {
  scheduleWarningAfterTimeout(timerRef, setWarning);
  updateLastMessageTime(timeRef);
}

function handleConnectionEstablished(
  warningTimerRef: React.MutableRefObject<Timeout | null>,
  timeRef: React.MutableRefObject<number>,
  setWarning: (value: boolean) => void,
): void {
  setWarning(false);
  clearTimer(warningTimerRef);
  updateLastMessageTime(timeRef);
}

function handleIdleStatus(
  warningTimerRef: React.MutableRefObject<Timeout | null>,
  setWarning: (value: boolean) => void,
): void {
  clearTimer(warningTimerRef);
  setWarning(false);
}

function monitorInitialConnection({
  currentStatus,
  previousStatus,
  warningTimerRef,
  lastMessageTimeRef,
  setIsShowingSlowWarning,
}: MonitorInitialConnectionParams): void {
  const sseConnectionEstablished = isConnectionEstablished(
    previousStatus,
    currentStatus,
  );

  if (currentStatus === ChatStatus.Submitted) {
    handleSubmittedStatus(
      warningTimerRef,
      lastMessageTimeRef,
      setIsShowingSlowWarning,
    );
  } else if (sseConnectionEstablished) {
    handleConnectionEstablished(
      warningTimerRef,
      lastMessageTimeRef,
      setIsShowingSlowWarning,
    );
  } else if (currentStatus !== ChatStatus.Streaming) {
    handleIdleStatus(warningTimerRef, setIsShowingSlowWarning);
  }
}

function calculateTimeSinceLastMessage(
  timeRef: React.MutableRefObject<number>,
): number {
  return Date.now() - timeRef.current;
}

function shouldShowError(timeSinceLastMessage: number): boolean {
  return timeSinceLastMessage > SSE_MESSAGE_GAP_TIMEOUT_MS;
}

function terminateConnection(
  stopChat: () => void,
  gapMonitorTimerRef: React.MutableRefObject<Timeout | null>,
  setWarning: (value: boolean) => void,
  setError: (value: string | null) => void,
  timeSinceLastMessage: number,
): void {
  console.error(
    `SSE connection timeout: No message received for ${timeSinceLastMessage}ms`,
  );

  stopChat();
  clearTimer(gapMonitorTimerRef);
  setWarning(false);

  const errorMessage = t(
    'Connection lost. The server stopped responding. Start a new chat or refresh your browser.',
  );
  setError(errorMessage);
}

function showWarningIfNeeded(
  isShowingWarningRef: React.MutableRefObject<boolean>,
  connectionErrorRef: React.MutableRefObject<string | null>,
  setIsShowingSlowWarning: (value: boolean) => void,
): void {
  if (!isShowingWarningRef.current && !connectionErrorRef.current) {
    setIsShowingSlowWarning(true);
  }
}

function scheduleWarningCheck(
  params: StartGapMonitoringParams,
  timeSinceLastMessage: number,
): void {
  const {
    gapMonitorTimerRef,
    lastMessageTimeRef,
    isShowingSlowWarningRef,
    connectionErrorRef,
    setIsShowingSlowWarning,
  } = params;

  const timeUntilWarning = RESPONSE_WARNING_MS - timeSinceLastMessage;

  if (timeUntilWarning > 0) {
    gapMonitorTimerRef.current = setTimeout(() => {
      gapMonitorTimerRef.current = null;

      const freshTimeSinceLastMessage =
        calculateTimeSinceLastMessage(lastMessageTimeRef);

      if (freshTimeSinceLastMessage >= RESPONSE_WARNING_MS) {
        showWarningIfNeeded(
          isShowingSlowWarningRef,
          connectionErrorRef,
          setIsShowingSlowWarning,
        );
      }

      scheduleNextCheck(params, ConnectionCheckType.Error);
    }, timeUntilWarning);
  } else {
    showWarningIfNeeded(
      isShowingSlowWarningRef,
      connectionErrorRef,
      setIsShowingSlowWarning,
    );
    scheduleNextCheck(params, ConnectionCheckType.Error);
  }
}

function scheduleErrorCheck(
  params: StartGapMonitoringParams,
  timeSinceLastMessage: number,
): void {
  const {
    gapMonitorTimerRef,
    lastMessageTimeRef,
    setIsShowingSlowWarning,
    setConnectionError,
    stopChat,
  } = params;

  const timeUntilError = SSE_MESSAGE_GAP_TIMEOUT_MS - timeSinceLastMessage;

  if (timeUntilError > 0) {
    gapMonitorTimerRef.current = setTimeout(() => {
      const finalTimeSinceLastMessage =
        calculateTimeSinceLastMessage(lastMessageTimeRef);

      if (shouldShowError(finalTimeSinceLastMessage)) {
        terminateConnection(
          stopChat,
          gapMonitorTimerRef,
          setIsShowingSlowWarning,
          setConnectionError,
          finalTimeSinceLastMessage,
        );
      } else {
        gapMonitorTimerRef.current = null;
        scheduleNextCheck(params, ConnectionCheckType.Warning);
      }
    }, timeUntilError);
  } else {
    terminateConnection(
      stopChat,
      gapMonitorTimerRef,
      setIsShowingSlowWarning,
      setConnectionError,
      timeSinceLastMessage,
    );
  }
}

function scheduleNextCheck(
  params: StartGapMonitoringParams,
  checkType: ConnectionCheckType,
): void {
  const { lastMessageTimeRef } = params;
  const timeSinceLastMessage =
    calculateTimeSinceLastMessage(lastMessageTimeRef);

  if (checkType === ConnectionCheckType.Warning) {
    scheduleWarningCheck(params, timeSinceLastMessage);
  } else {
    scheduleErrorCheck(params, timeSinceLastMessage);
  }
}

function startGapMonitoringIfNeeded(params: StartGapMonitoringParams): void {
  if (params.gapMonitorTimerRef.current) {
    return;
  }

  scheduleNextCheck(params, ConnectionCheckType.Warning);
}
