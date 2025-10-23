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
