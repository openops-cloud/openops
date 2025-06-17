import { Star } from 'lucide-react';
import { cn } from '../../../lib/cn';

type BranchLabelProps = {
  branchName: string;
  isDefaultBranch: boolean;
  buttonPosition: { x: number; y: number };
};

const LABEL_WIDTH = 100;
const LABEL_HEIGHT = 28;
const LABEL_X_OFFSET = 38;
const LABEL_Y_OFFSET = 18;

export const BranchLabel = ({
  branchName,
  isDefaultBranch,
  buttonPosition,
}: BranchLabelProps) => {
  return (
    <foreignObject
      width={LABEL_WIDTH}
      height={LABEL_HEIGHT}
      className="z-50 relative pointer-events-none cursor-default"
      x={buttonPosition.x - LABEL_X_OFFSET}
      y={buttonPosition.y - LABEL_Y_OFFSET}
    >
      <div
        style={{
          minWidth: `${LABEL_WIDTH}px`,
          height: `${LABEL_HEIGHT}px`,
        }}
        className="flex flex-row justify-center items-center text-accent-foreground select-none cursor-default p-2 bg-gray-500 text-white rounded-sm overflow-hidden"
      >
        {isDefaultBranch && (
          <div className="w-4 h-4 mx-1 flex items-center justify-center">
            <Star fill="white" className="ml-1 w-4 h-4" />
          </div>
        )}
        <div
          className={cn(
            'text-sm font-light overflow-hidden text-center truncate',
            {
              'ml-1': isDefaultBranch,
            },
          )}
        >
          {branchName}
        </div>
      </div>
    </foreignObject>
  );
};
