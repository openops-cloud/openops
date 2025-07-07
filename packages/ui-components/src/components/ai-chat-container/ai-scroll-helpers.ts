import { ChatStatus } from './ai-chat-input';

const BUFFER_MIN_HEIGHT = 32;
const BUFFER_READY_GAP = 280;
const BUFFER_STREAMING_GAP = 240;
const DEFAULT_USER_MSG_HEIGHT = 62;

export function getLastUserMessageId(
  messages: { id: string; role: string }[],
): string | null {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  return lastUserIndex !== -1 ? messages[lastUserIndex].id : null;
}

export function getBufferAreaHeight(
  containerHeight: number,
  currentBufferAreaHeight: number,
  lastUserMsgHeight: number,
  lastAssistantMsgHeight: number,
  status?: ChatStatus,
  options?: {
    readyGap?: number;
    streamingGap?: number;
  },
): number {
  if (status === ChatStatus.READY) {
    return Math.floor(
      Math.max(
        BUFFER_MIN_HEIGHT,
        containerHeight -
          lastAssistantMsgHeight -
          (options?.readyGap ?? BUFFER_READY_GAP),
      ),
    );
  }

  if (
    [ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status as ChatStatus)
  ) {
    const userMsgHeight =
      lastUserMsgHeight > 0 ? lastUserMsgHeight : DEFAULT_USER_MSG_HEIGHT;
    return Math.floor(
      Math.max(
        0,
        containerHeight -
          userMsgHeight -
          (options?.streamingGap ?? BUFFER_STREAMING_GAP),
      ),
    );
  }

  return Math.floor(
    Math.max(
      BUFFER_MIN_HEIGHT,
      currentBufferAreaHeight - lastAssistantMsgHeight,
    ),
  );
}
