import { cn } from '../../../lib/cn';

type BranchLabelProps = {
  branchName: string;
  isDefaultBranch: boolean;
  buttonPosition: { x: number; y: number };
};

const LABEL_WIDTH = 116;
const LABEL_HEIGHT = 28;
const LABEL_X_OFFSET = 50;
const LABEL_Y_OFFSET = 18;
const LABEL_PADDING = 6;

export const BranchLabel = ({
  branchName,
  isDefaultBranch,
  buttonPosition,
}: BranchLabelProps) => {
  const x = buttonPosition.x - LABEL_X_OFFSET;
  const y = buttonPosition.y - LABEL_Y_OFFSET;
  return (
    <g>
      <rect
        x={x - LABEL_PADDING}
        y={y - LABEL_PADDING}
        width={LABEL_WIDTH + LABEL_PADDING * 2}
        height={LABEL_HEIGHT + LABEL_PADDING * 2}
        fill="#6B7280" // bg-gray-500
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {isDefaultBranch && (
        // Star icon as SVG path (Lucide's Star)
        <svg
          x={x + 8}
          y={y + (LABEL_HEIGHT - 16) / 2}
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="white"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
      <text
        x={x + LABEL_WIDTH / 2 + (isDefaultBranch ? 8 : 0)}
        y={y + LABEL_HEIGHT / 2 + 5}
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="white"
        fontSize="14"
        fontWeight="400"
        className={cn('text-sm font-light', {
          'ml-1': isDefaultBranch,
        })}
        style={{
          dominantBaseline: 'middle',
          pointerEvents: 'none',
        }}
      >
        {branchName}
      </text>
    </g>
  );
};
