import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResizeIcon from '../../icons/resize-icon';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';

type ResizeHandlePosition = 'bottom-right' | 'top-right';

interface ResizableAreaProps {
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  children: React.ReactNode;
  className?: string;
  resizeFrom?: ResizeHandlePosition;
}

export function ResizableArea({
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  children,
  className,
  resizeFrom = 'bottom-right',
}: ResizableAreaProps) {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;

      const calculatedHeight =
        resizeFrom === 'bottom-right'
          ? startPosRef.current.height + dy
          : startPosRef.current.height - dy;

      setDimensions({
        width: Math.min(
          Math.max(startPosRef.current.width + dx, minWidth),
          maxWidth,
        ),
        height: Math.min(Math.max(calculatedHeight, minHeight), maxHeight),
      });
    },
    [resizeFrom, minHeight, maxHeight, minWidth, maxWidth],
  );

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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
      <ScrollArea className="w-full h-full pr-3">{children}</ScrollArea>

      <ResizeIcon
        className={cn(
          'absolute bottom-1 right-1 w-3 h-3 cursor-nwse-resize pointer-events-auto text-primary/40',
          {
            'top-1 right-1 cursor-nesw-resize rotate-[-90deg]':
              resizeFrom === 'top-right',
          },
        )}
        onMouseDown={startResize}
      ></ResizeIcon>
    </div>
  );
}
