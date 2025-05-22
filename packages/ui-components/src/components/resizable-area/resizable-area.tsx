import React, { useCallback, useEffect, useRef } from 'react';
import ResizeIcon from '../../icons/resize-icon';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';

type ResizeHandlePosition = 'bottom-right' | 'top-right';

export interface BoxSize {
  width: number;
  height: number;
}

interface ResizableAreaProps {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  children: React.ReactNode;
  className?: string;
  scrollAreaClassName?: string;
  resizeFrom?: ResizeHandlePosition;
  isDisabled?: boolean;
  setDimensions: (dimensions: BoxSize) => void;
  dimensions: BoxSize;
}

export function ResizableArea({
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  children,
  className,
  scrollAreaClassName,
  resizeFrom = 'bottom-right',
  isDisabled,
  dimensions,
  setDimensions,
}: ResizableAreaProps) {
  useEffect(() => {
    if (maxHeight < dimensions.height && maxHeight > 0) {
      setDimensions({
        width: dimensions.width,
        height: maxHeight,
      });
    }
  }, [dimensions.height, dimensions.width, maxHeight, setDimensions]);

  useEffect(() => {
    if (maxWidth < dimensions.width && maxWidth > 0) {
      setDimensions({
        width: maxWidth,
        height: dimensions.height,
      });
    }
  }, [dimensions.height, dimensions.width, maxWidth, setDimensions]);

  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const toggleIframePointerEvents = (enabled: boolean) => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.style.pointerEvents = enabled ? 'initial' : 'none';
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;

      const calculatedHeight =
        resizeFrom === 'bottom-right'
          ? startPosRef.current.height + dy
          : startPosRef.current.height - dy;

      const newDimension = {
        width: Math.min(
          Math.max(startPosRef.current.width + dx, minWidth),
          maxWidth,
        ),
        height: Math.min(Math.max(calculatedHeight, minHeight), maxHeight),
      };
      setDimensions(newDimension);
    },
    [resizeFrom, minWidth, maxWidth, minHeight, maxHeight, setDimensions],
  );

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    toggleIframePointerEvents(true);
  }, [handleMouseMove]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = resizeRef.current?.getBoundingClientRect();
    if (rect) {
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
      isResizingRef.current = true;
      toggleIframePointerEvents(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      toggleIframePointerEvents(true);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={resizeRef}
      className={cn(
        'relative p-4 pr-0',
        {
          'absolute bottom-0': resizeFrom === 'top-right',
        },
        className,
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        touchAction: 'none',
      }}
    >
      <ScrollArea className={cn('w-full h-full pr-3', scrollAreaClassName)}>
        {children}
      </ScrollArea>

      <ResizeIcon
        className={cn(
          'absolute bottom-1 right-1 w-3 h-3 cursor-nwse-resize pointer-events-auto text-border-300',
          {
            'top-1 right-1 cursor-nesw-resize rotate-[-90deg]':
              resizeFrom === 'top-right',
            'opacity-25 pointer-events-none cursor-not-allowed': isDisabled,
          },
        )}
        onMouseDown={startResize}
      />
    </div>
  );
}

ResizableArea.displayName = 'ResizableArea';
