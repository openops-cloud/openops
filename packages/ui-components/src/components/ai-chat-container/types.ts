export const AI_CHAT_CONTAINER_SIZES = {
  DOCKED: 'docked',
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
} as const;

export type AiCliChatContainerSizeState =
  (typeof AI_CHAT_CONTAINER_SIZES)[keyof typeof AI_CHAT_CONTAINER_SIZES];

export type AiAssistantChatSizeState = Extract<
  AiCliChatContainerSizeState,
  'docked' | 'expanded'
>;
