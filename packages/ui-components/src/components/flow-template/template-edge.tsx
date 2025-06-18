import { BaseEdge } from '@xyflow/react';
import React from 'react';
import {
  EdgePath,
  getEdgePath,
  getLengthMultiplier,
  getPositionRelativeToParent,
  LINE_WIDTH,
} from '../../lib/flow-canvas-utils';

const TemplateEdge = React.memo((props: EdgePath) => {
  const { isInsideSplit, isInsideBranch, isInsideLoop } =
    getPositionRelativeToParent(props.data.stepLocationRelativeToParent);
  const lengthMultiplier = getLengthMultiplier({
    isInsideBranch,
    isInsideSplit,
    isInsideLoop,
  });

  const { edgePath } = getEdgePath({
    ...props,
    lengthMultiplier,
  });

  return (
    <BaseEdge
      interactionWidth={0}
      path={edgePath}
      style={{ strokeWidth: `${LINE_WIDTH}px` }}
      className="cursor-default !stroke-greyBlue"
    />
  );
});

TemplateEdge.displayName = 'TemplateEdge';
export { TemplateEdge };
