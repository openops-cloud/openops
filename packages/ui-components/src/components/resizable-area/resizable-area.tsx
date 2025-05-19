import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResizeIcon from '../../icons/resize-icon';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';

type ResizeHandlePosition = 'bottom-right' | 'top-right';

export interface BoxSize {
  width: number;
  height: number;
}

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
  onResize?: (size: BoxSize) => void;
  isDisabled?: boolean;
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
  onResize,
  isDisabled,
}: ResizableAreaProps) {
  const [dimensions, setDimensions] = useState<BoxSize>({
    width: initialWidth,
    height: initialHeight,
  });

  useEffect(() => {
    setDimensions({
      width: initialWidth,
      height: initialHeight,
    });
  }, [initialWidth, initialHeight]);

  useEffect(() => {
    if (maxHeight < dimensions.height) {
      setDimensions((prev) => ({
        ...prev,
        height: Math.min(prev.height, maxHeight),
      }));
      onResize?.({
        width: dimensions.width,
        height: Math.min(dimensions.height, maxHeight),
      });
    }
  }, [dimensions.height, dimensions.width, maxHeight, maxWidth, onResize]);

  useEffect(() => {
    if (maxWidth < dimensions.width) {
      setDimensions((prev) => ({
        ...prev,
        width: Math.min(prev.width, maxWidth),
      }));
      onResize?.({
        height: dimensions.height,
        width: Math.min(dimensions.width, maxWidth),
      });
    }
  }, [dimensions.height, dimensions.width, maxHeight, maxWidth, onResize]);

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

      const newDimension = {
        width: Math.min(
          Math.max(startPosRef.current.width + dx, minWidth),
          maxWidth,
        ),
        height: Math.min(Math.max(calculatedHeight, minHeight), maxHeight),
      };
      setDimensions(newDimension);
      onResize?.(newDimension);
    },
    [resizeFrom, minWidth, maxWidth, minHeight, maxHeight, onResize],
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
            'opacity-50 pointer-events-none cursor-not-allowed': isDisabled,
          },
        )}
        onMouseDown={startResize}
      ></ResizeIcon>
    </div>
  );
}
