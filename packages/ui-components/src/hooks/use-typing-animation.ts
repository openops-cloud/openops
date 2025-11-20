import { useEffect, useRef, useState } from 'react';

type UseTypingAnimationOptions = {
  text: string;
  speed?: number;
  chatId?: string | null;
  isDefault?: boolean;
};

export function useTypingAnimation({
  text,
  speed = 50,
  chatId,
  isDefault,
}: UseTypingAnimationOptions): string {
  const [displayedText, setDisplayedText] = useState(text);
  const prevChatIdRef = useRef(chatId);
  const prevIsDefaultRef = useRef(isDefault);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const shouldAnimate =
      prevChatIdRef.current === chatId &&
      prevIsDefaultRef.current === true &&
      isDefault === false;

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

      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }

    prevChatIdRef.current = chatId;
    prevIsDefaultRef.current = isDefault;
  }, [text, speed, chatId, isDefault]);

  return displayedText;
}
