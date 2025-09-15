import { OPS_NODE_SIZE, cn } from '@openops/components/ui';

export const StackedNodeLayer = ({
  widthOffset,
  top,
  left,
  zIndex,
  isSelected,
  isDragging,
}: {
  widthOffset: number;
  top: string;
  left: string;
  zIndex: number;
  isSelected: boolean;
  isDragging: boolean;
}) => (
  <div
    className={cn(
      'absolute rounded-sm border border-solid border-border-300 transition-all group-hover:border-primary-200 pointer-events-none',
      {
        'border-primary-200': isSelected,
        'bg-background': !isDragging,
        'border-none': isDragging,
        'shadow-none': isDragging,
      },
    )}
    style={{
      height: `${OPS_NODE_SIZE.stepNode.height}px`,
      width: `${OPS_NODE_SIZE.stepNode.width - widthOffset}px`,
      top,
      left,
      zIndex,
    }}
  />
);
