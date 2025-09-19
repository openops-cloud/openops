import { OPS_NODE_SIZE, cn } from '@openops/components/ui';

export const StackedNodeLayers = ({
  isSelected,
  isDragging,
}: {
  isSelected: boolean;
  isDragging: boolean;
}) => (
  <>
    {[
      { widthOffset: 16, top: '-8px', left: '8px', zIndex: 1 },
      { widthOffset: 8, top: '-4px', left: '4px', zIndex: 2 },
    ].map((props) => (
      <div
        key={`${props.widthOffset}-${props.zIndex}`}
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
          width: `${OPS_NODE_SIZE.stepNode.width - props.widthOffset}px`,
          top: props.top,
          left: props.left,
          zIndex: props.zIndex,
        }}
      />
    ))}
  </>
);
