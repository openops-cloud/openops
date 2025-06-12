import { MutableRefObject, RefObject, useEffect } from 'react';
import { AI_CHAT_SCROLL_DELAY } from '../../lib/constants';
import { AIChatMessageRole } from '../ai-chat-messages';

export function useScrollToLastUserMessage({
  messages,
  showAiChat,
  scrollViewportRef,
  lastUserMessageId,
  streamingEndRef,
}: {
  messages: { id: string; role: string }[];
  showAiChat: boolean;
  scrollViewportRef: RefObject<HTMLDivElement>;
  lastUserMessageId: MutableRefObject<string | null>;
  streamingEndRef: RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    const scrollArea = scrollViewportRef.current;
    if (!scrollArea || scrollArea.scrollHeight <= scrollArea.clientHeight) {
      return;
    }
    if (messages.length && showAiChat) {
      const lastUserIndex = messages
        .map((m) => m.role)
        .lastIndexOf(AIChatMessageRole.user);
      if (
        lastUserIndex !== -1 &&
        lastUserMessageId.current !== messages[lastUserIndex].id
      ) {
        lastUserMessageId.current = messages[lastUserIndex].id;
        streamingEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  }, [
    messages,
    showAiChat,
    lastUserMessageId,
    streamingEndRef,
    scrollViewportRef,
  ]);
}

export function useScrollToBottomOnOpen({
  isEmpty,
  showAiChat,
  messages,
  hasAutoScrolled,
  scrollViewportRef,
}: {
  isEmpty: boolean;
  showAiChat: boolean;
  messages: { id: string; role: string }[];
  hasAutoScrolled: MutableRefObject<boolean>;
  scrollViewportRef: RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!isEmpty && showAiChat && messages.length && !hasAutoScrolled.current) {
      timeoutId = setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'instant',
          });
          hasAutoScrolled.current = true;
        }
      }, AI_CHAT_SCROLL_DELAY);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    isEmpty,
    showAiChat,
    messages.length,
    hasAutoScrolled,
    scrollViewportRef,
  ]);
}
