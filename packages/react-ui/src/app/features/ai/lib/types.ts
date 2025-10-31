import { UIMessage } from '@ai-sdk/ui-utils'; // Fix this
import { OpenChatResponse } from '@openops/shared';

export type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
export type MessageType = ServerMessage | UIMessage;

export enum ChatMode {
  StepSettings = 'step-settings',
  Agent = 'agent',
}

type UseAssistantChatContext = {
  flowId: string;
  flowVersionId: string;
  runId: string | undefined;
  selectedStep: string | null;
  showSettingsAIChat: boolean;
};

export interface UseAssistantChatProps {
  chatId: string | null;
  onChatIdChange: (chatId: string | null) => void;
  chatMode: ChatMode;
  context: UseAssistantChatContext | undefined;
}

export enum ChatStatus {
  Submitted = 'submitted',
  Streaming = 'streaming',
  Ready = 'ready',
  Error = 'error',
}

export type Timeout = ReturnType<typeof setTimeout>;
export enum ConnectionCheckType {
  Warning = 'warning',
  Error = 'error',
}

export type ChatStatusType = ChatStatus;

export interface UseConnectionMonitoringProps {
  chatStatus: ChatStatusType;
  messages: any[];
  stopChat: () => void;
}

export interface UseConnectionMonitoringReturn {
  isShowingSlowWarning: boolean;
  connectionError: string | null;
  clearConnectionState: () => void;
}

export interface MonitorInitialConnectionParams {
  currentStatus: ChatStatusType;
  previousStatus: ChatStatusType;
  warningTimerRef: React.MutableRefObject<Timeout | null>;
  lastMessageTimeRef: React.MutableRefObject<number>;
  setIsShowingSlowWarning: (value: boolean) => void;
}

export interface StartGapMonitoringParams {
  gapMonitorTimerRef: React.MutableRefObject<Timeout | null>;
  lastMessageTimeRef: React.MutableRefObject<number>;
  isShowingSlowWarningRef: React.MutableRefObject<boolean>;
  connectionErrorRef: React.MutableRefObject<string | null>;
  setIsShowingSlowWarning: (value: boolean) => void;
  setConnectionError: (value: string | null) => void;
  stopChat: () => void;
}
