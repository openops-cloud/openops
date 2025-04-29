import { RefObject, useEffect, useState } from 'react';

/**
 * @deprecated Use useMeasure from 'react-use' instead.
 * Example:
 * ```
 * import { useMeasure } from 'react-use';
 * const [ref, { width, height }] = useMeasure<HTMLDivElement>();
 * ```
 */
export const useElementSize = (ref: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, setSize]);

  return size;
};
