import { OpenChatResponse } from '@openops/shared';
import { ChatStatus as AIChatStatus, UIMessage } from 'ai';

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

export const ChatStatus = {
  Submitted: 'submitted',
  Streaming: 'streaming',
  Ready: 'ready',
  Error: 'error',
} as const satisfies Record<string, AIChatStatus>;

export type ChatStatusType = AIChatStatus;

export interface UseConnectionMonitoringReturn {
  isShowingSlowWarning: boolean;
  connectionError: string | null;
  clearConnectionState: () => void;
  setConnectionErrorMessage: () => void;
}
