import { useEffect, useRef, useState } from 'react';

type UseTypingAnimationOptions = {
  text: string;
  speed?: number;
  fromText?: string;
  chatId?: string | null;
  defaultText?: string;
};

export function useTypingAnimation({
  text,
  speed = 50,
  fromText,
  chatId,
  defaultText,
}: UseTypingAnimationOptions): string {
  const [displayedText, setDisplayedText] = useState(text);
  const prevTextRef = useRef(text);
  const prevChatIdRef = useRef<string | null | undefined>(chatId);

  useEffect(() => {
    let shouldAnimate = false;
    let interval: NodeJS.Timeout | undefined;

    if (fromText !== undefined && defaultText !== undefined) {
      const isSameChat = prevChatIdRef.current === chatId;
      const wasDefault =
        prevTextRef.current === defaultText || prevTextRef.current === fromText;
      const nowHasName = text !== defaultText && text !== fromText;

      shouldAnimate = isSameChat && wasDefault && nowHasName;
    } else if (fromText !== undefined) {
      shouldAnimate = prevTextRef.current === fromText && text !== fromText;
    }

    if (shouldAnimate && text.length > 0) {
      setDisplayedText('');
      let currentIndex = 0;

      interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, speed);
    } else {
      setDisplayedText(text);
    }

    prevTextRef.current = text;
    prevChatIdRef.current = chatId;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [text, speed, fromText, chatId, defaultText]);

  return displayedText;
}
