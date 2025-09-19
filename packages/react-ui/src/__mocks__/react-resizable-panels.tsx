import React from 'react';

// Mock implementation of react-resizable-panels for Jest testing
export const PanelGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'horizontal' | 'vertical';
    onLayout?: (sizes: number[]) => void;
  }
>(({ children, className, direction = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    data-panel-group-direction={direction}
    {...props}
  >
    {children}
  </div>
));

export const Panel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
    collapsed?: boolean;
    onCollapse?: () => void;
    onExpand?: () => void;
  }
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));

export const PanelResizeHandle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    disabled?: boolean;
    onDragging?: (isDragging: boolean) => void;
  }
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));

PanelGroup.displayName = 'PanelGroup';
Panel.displayName = 'Panel';
PanelResizeHandle.displayName = 'PanelResizeHandle';
