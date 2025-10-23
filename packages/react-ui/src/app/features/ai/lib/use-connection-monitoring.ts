import { t } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { SERVER_HEARTBEAT_INTERVAL_MS } from './constants';

const RESPONSE_WARNING_MS = SERVER_HEARTBEAT_INTERVAL_MS + 1000;
const SSE_MESSAGE_GAP_TIMEOUT_MS = SERVER_HEARTBEAT_INTERVAL_MS + 7000;
const GAP_CHECK_INTERVAL_MS = 2000;

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

interface UseConnectionMonitoringProps {
  chatStatus: ChatStatus;
  messages: any[];
  stopChat: () => void;
}

interface UseConnectionMonitoringReturn {
  isShowingSlowWarning: boolean;
  connectionError: string | null;
  clearConnectionState: () => void;
}

interface MonitorInitialConnectionParams {
  currentStatus: ChatStatus;
  previousStatus: ChatStatus;
  warningTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastMessageTimeRef: React.MutableRefObject<number>;
  setIsShowingSlowWarning: (value: boolean) => void;
}

interface StartGapMonitoringParams {
  gapMonitorTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastMessageTimeRef: React.MutableRefObject<number>;
  isShowingSlowWarningRef: React.MutableRefObject<boolean>;
  connectionErrorRef: React.MutableRefObject<string | null>;
  setIsShowingSlowWarning: (value: boolean) => void;
  setConnectionError: (value: string | null) => void;
  stopChat: () => void;
}

export const useConnectionMonitoring = ({
  chatStatus,
  messages,
  stopChat,
}: UseConnectionMonitoringProps): UseConnectionMonitoringReturn => {
  const [isShowingSlowWarning, setIsShowingSlowWarning] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const lastMessageTimeRef = useRef<number>(Date.now());
  const previousStatusRef = useRef<ChatStatus>(chatStatus);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gapMonitorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isShowingSlowWarningRef = useRef<boolean>(isShowingSlowWarning);
  const connectionErrorRef = useRef<string | null>(connectionError);

  const isActivelyLoading = isSubmittedOrStreaming(chatStatus);

  useEffect(() => {
    isShowingSlowWarningRef.current = isShowingSlowWarning;
  }, [isShowingSlowWarning]);

  useEffect(() => {
    connectionErrorRef.current = connectionError;
  }, [connectionError]);

  const clearConnectionState = () => {
    setConnectionError(null);
    setIsShowingSlowWarning(false);
  };

  useEffect(() => {
    monitorInitialConnection({
      currentStatus: chatStatus,
      previousStatus: previousStatusRef.current,
      warningTimerRef,
      lastMessageTimeRef,
      setIsShowingSlowWarning,
    });

    previousStatusRef.current = chatStatus;

    return () => clearWarningTimer(warningTimerRef);
  }, [chatStatus]);

  useEffect(() => {
    if (!isActivelyLoading) {
      stopGapMonitoring(gapMonitorTimerRef);
      return;
    }

    updateLastMessageTime(lastMessageTimeRef);

    if (isShowingSlowWarningRef.current && !connectionErrorRef.current) {
      setIsShowingSlowWarning(false);
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

    return () => stopGapMonitoring(gapMonitorTimerRef);
  }, [isActivelyLoading, messages, stopChat]);

  return {
    isShowingSlowWarning,
    connectionError,
    clearConnectionState,
  };
};

function isSubmittedOrStreaming(status: ChatStatus): boolean {
  return status === 'submitted' || status === 'streaming';
}

function isConnectionEstablished(
  previousStatus: ChatStatus,
  currentStatus: ChatStatus,
): boolean {
  return previousStatus === 'submitted' && currentStatus === 'streaming';
}

function clearWarningTimer(
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function stopGapMonitoring(
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
): void {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function updateLastMessageTime(timeRef: React.MutableRefObject<number>): void {
  timeRef.current = Date.now();
}

function scheduleWarningAfterTimeout(
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setWarning: (value: boolean) => void,
): void {
  if (!timerRef.current) {
    timerRef.current = setTimeout(() => {
      setWarning(true);
    }, RESPONSE_WARNING_MS);
  }
}

function handleSubmittedStatus(
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  timeRef: React.MutableRefObject<number>,
  setWarning: (value: boolean) => void,
): void {
  scheduleWarningAfterTimeout(timerRef, setWarning);
  updateLastMessageTime(timeRef);
}

function handleConnectionEstablished(
  warningTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  timeRef: React.MutableRefObject<number>,
  setWarning: (value: boolean) => void,
): void {
  setWarning(false);
  clearWarningTimer(warningTimerRef);
  updateLastMessageTime(timeRef);
}

function handleStreamingStatus(timeRef: React.MutableRefObject<number>): void {
  updateLastMessageTime(timeRef);
}

function handleIdleStatus(
  warningTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setWarning: (value: boolean) => void,
): void {
  clearWarningTimer(warningTimerRef);
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

  if (currentStatus === 'submitted') {
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
  } else if (currentStatus === 'streaming') {
    handleStreamingStatus(lastMessageTimeRef);
  } else {
    handleIdleStatus(warningTimerRef, setIsShowingSlowWarning);
  }
}

function calculateTimeSinceLastMessage(
  timeRef: React.MutableRefObject<number>,
): number {
  return Date.now() - timeRef.current;
}

function shouldShowWarning(
  timeSinceLastMessage: number,
  isShowingWarning: boolean,
  hasError: string | null,
): boolean {
  return (
    timeSinceLastMessage > RESPONSE_WARNING_MS && !isShowingWarning && !hasError
  );
}

function shouldShowError(timeSinceLastMessage: number): boolean {
  return timeSinceLastMessage > SSE_MESSAGE_GAP_TIMEOUT_MS;
}

function terminateConnection(
  stopChat: () => void,
  gapMonitorTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setWarning: (value: boolean) => void,
  setError: (value: string | null) => void,
  timeSinceLastMessage: number,
): void {
  console.error(
    `SSE connection timeout: No message received for ${timeSinceLastMessage}ms`,
  );

  stopChat();
  stopGapMonitoring(gapMonitorTimerRef);
  setWarning(false);
  setError(
    t(
      'Connection lost. The server stopped responding. Start a new chat or refresh your browser.',
    ),
  );
}

function startGapMonitoringIfNeeded({
  gapMonitorTimerRef,
  lastMessageTimeRef,
  isShowingSlowWarningRef,
  connectionErrorRef,
  setIsShowingSlowWarning,
  setConnectionError,
  stopChat,
}: StartGapMonitoringParams): void {
  if (gapMonitorTimerRef.current) {
    return;
  }

  gapMonitorTimerRef.current = setInterval(() => {
    const timeSinceLastMessage =
      calculateTimeSinceLastMessage(lastMessageTimeRef);

    if (
      shouldShowWarning(
        timeSinceLastMessage,
        isShowingSlowWarningRef.current,
        connectionErrorRef.current,
      )
    ) {
      setIsShowingSlowWarning(true);
    }

    if (shouldShowError(timeSinceLastMessage)) {
      terminateConnection(
        stopChat,
        gapMonitorTimerRef,
        setIsShowingSlowWarning,
        setConnectionError,
        timeSinceLastMessage,
      );
    }
  }, GAP_CHECK_INTERVAL_MS);
}
