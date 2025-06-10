export const BUFFER_MIN_HEIGHT = 32;
export const BUFFER_READY_GAP = 280;
export const BUFFER_STREAMING_GAP = 240;

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
  status?: string,
  options?: {
    readyGap?: number;
    streamingGap?: number;
  },
): number {
  if (status === 'ready') {
    return Math.floor(
      Math.max(
        BUFFER_MIN_HEIGHT,
        containerHeight -
          lastAssistantMsgHeight -
          (options?.readyGap ?? BUFFER_READY_GAP),
      ),
    );
  }

  if (['streaming', 'submitted'].includes(status ?? '')) {
    return Math.floor(
      Math.max(
        0,
        containerHeight -
          lastUserMsgHeight -
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
