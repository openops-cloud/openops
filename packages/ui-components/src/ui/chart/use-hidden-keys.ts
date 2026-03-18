import { useCallback, useState } from 'react';

export function useHiddenKeys(): {
  hiddenKeys: Set<string>;
  toggleKey: (key: string) => void;
} {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return { hiddenKeys, toggleKey };
}
