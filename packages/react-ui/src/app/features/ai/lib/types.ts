import { UIMessage } from '@ai-sdk/ui-utils'; // Fix this
import { OpenChatResponse } from '@openops/shared';

export type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
export type MessageType = ServerMessage | UIMessage;

export enum ChatMode {
  StepSettings = 'step-settings',
  Agent = 'agent',
}
